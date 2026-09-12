import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminToken } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

// CRUD de facturas del panel Admin.
// La superuser service role key NUNCA vive en el bundle del frontend:
// aquí se usa solo server-side y la llamada exige un token de admin válido
// (verificado en _shared/auth.ts).
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminUser = await verifyAdminToken(req);
  if (!adminUser) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const action = payload?.action;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            products (id, title)
          `)
          .order("created_at", { ascending: false });
        if (error) return json(500, { error: error.message });
        return json(200, data);
      }

      case "get": {
        if (!payload?.id) return json(400, { error: "id es requerido" });
        const { data, error } = await supabase
          .from("invoices")
          .select(`
            *,
            products (id, title, description, full_description)
          `)
          .eq("id", payload.id)
          .single();
        if (error) {
          if (error.code === "PGRST116") {
            return json(404, { error: "Factura no encontrada" });
          }
          return json(500, { error: error.message });
        }
        return json(200, data);
      }

      case "create": {
        const invoice = payload?.invoice;
        if (!invoice || typeof invoice !== "object") {
          return json(400, { error: "invoice es requerido" });
        }

        const currentYear = new Date().getFullYear();
        const yearPrefix = `INV-${currentYear}-`;

        const { data: yearInvoices, error: yearInvoicesError } = await supabase
          .from("invoices")
          .select("invoice_number")
          .like("invoice_number", `${yearPrefix}%`)
          .order("invoice_number", { ascending: false });

        if (yearInvoicesError && yearInvoicesError.code !== "PGRST116") {
          return json(500, {
            error: `Error al obtener facturas del año: ${yearInvoicesError.message}`,
          });
        }

        let invoiceNumber = `${yearPrefix}0001`;
        if (yearInvoices && yearInvoices.length > 0) {
          const lastNumber = yearInvoices
            .map((inv: any) => {
              const invNum =
                typeof inv.invoice_number === "string"
                  ? inv.invoice_number
                  : String(inv.invoice_number);
              if (invNum.startsWith(yearPrefix)) {
                const parsed = parseInt(invNum.replace(yearPrefix, ""), 10);
                return isNaN(parsed) ? 0 : parsed;
              }
              return 0;
            })
            .reduce((max: number, num: number) => Math.max(max, num), 0);
          invoiceNumber = `${yearPrefix}${String(lastNumber + 1).padStart(4, "0")}`;
        }

        const { data, error } = await supabase
          .from("invoices")
          .insert({
            ...invoice,
            invoice_number: invoiceNumber,
            status: invoice.status || "pending",
          })
          .select()
          .single();

        if (error) {
          return json(500, {
            error: `Error al crear factura: ${error.message}`,
          });
        }
        return json(200, data);
      }

      case "update": {
        const id = payload?.id;
        const updates = payload?.updates || {};
        if (!id) return json(400, { error: "id es requerido" });

        const { data: currentInvoice } = await supabase
          .from("invoices")
          .select("status")
          .eq("id", id)
          .single();

        if (
          currentInvoice?.status === "paid" ||
          currentInvoice?.status === "completed"
        ) {
          return json(400, {
            error:
              "No se puede editar una factura que ya está pagada o completada",
          });
        }

        const cleanUpdates: any = {};
        const allowedFields = [
          "user_name",
          "user_email",
          "request_type",
          "amount",
          "currency",
          "delivery_time",
          "custom_fields",
          "pay_now_link",
          "status",
          "product_id",
        ];
        for (const key of allowedFields) {
          if (key in updates) {
            cleanUpdates[key] = updates[key];
          }
        }

        const { data, error } = await supabase
          .from("invoices")
          .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select(
            "id, invoice_number, product_id, user_name, user_email, request_type, amount, currency, delivery_time, custom_fields, pay_now_link, status, created_at, updated_at"
          )
          .single();

        if (error) {
          return json(500, {
            error: `Error al actualizar factura: ${error.message}`,
          });
        }
        return json(200, data);
      }

      case "delete": {
        const id = payload?.id;
        if (!id) return json(400, { error: "id es requerido" });

        const { data: currentInvoice } = await supabase
          .from("invoices")
          .select("status")
          .eq("id", id)
          .single();

        if (
          currentInvoice?.status === "paid" ||
          currentInvoice?.status === "completed"
        ) {
          return json(400, {
            error:
              "No se puede eliminar una factura que ya está pagada o completada",
          });
        }

        const { error } = await supabase.from("invoices").delete().eq("id", id);
        if (error) {
          return json(500, { error: `Error al eliminar factura: ${error.message}` });
        }
        return json(200, { ok: true });
      }

      default:
        return json(400, { error: `Acción desconocida: ${action}` });
    }
  } catch (error) {
    console.error("Error en admin-invoices:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
});