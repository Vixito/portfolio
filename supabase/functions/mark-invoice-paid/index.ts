import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Inicializar cliente de Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parsear request body
    const {
      invoice_id,
      invoice_number,
      transaction_id,
      amount,
      currency,
      paid_at,
    } = await req.json();

    // Validar campos requeridos
    if (!invoice_id && !invoice_number) {
      return new Response(
        JSON.stringify({
          error: "invoice_id or invoice_number is required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!transaction_id) {
      return new Response(
        JSON.stringify({ error: "transaction_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Buscar la factura por ID o número
    let invoiceQuery = supabase.from("invoices").select("id, status");

    if (invoice_id) {
      invoiceQuery = invoiceQuery.eq("id", invoice_id);
    } else {
      invoiceQuery = invoiceQuery.eq("invoice_number", invoice_number);
    }

    const { data: invoice, error: invoiceError } = await invoiceQuery
      .single();

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verificar que la factura no esté ya pagada
    if (invoice.status === "paid" || invoice.status === "completed") {
      return new Response(
        JSON.stringify({
          error: "Invoice is already paid or completed",
          invoice_id: invoice.id,
          current_status: invoice.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Actualizar la factura
    const updateData: any = {
      status: "paid",
      transaction_id: transaction_id,
      paid_at: paid_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Opcional: validar que el monto coincida (si se proporciona)
    if (amount !== undefined) {
      // Aquí podrías agregar validación de monto si lo necesitas
      // Por ahora solo lo guardamos como referencia
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update(updateData)
      .eq("id", invoice.id)
      .select("id, invoice_number, status, transaction_id, paid_at")
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Failed to update invoice",
          message: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice marked as paid successfully",
        invoice: updatedInvoice,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error en mark-invoice-paid:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
