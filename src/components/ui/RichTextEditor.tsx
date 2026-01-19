import { useRef } from "react";
import ReactQuill from "react-quill";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Escribe aquí...",
}: RichTextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);

  // Configuración de la barra de herramientas (sin selector de fuente)
  const modules = {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }], // Tamaños de encabezado
        ["bold", "italic", "underline", "strike"], // Formato de texto
        [{ color: [] }, { background: [] }], // Color de texto y fondo
        [{ list: "ordered" }, { list: "bullet" }], // Listas
        [{ indent: "-1" }, { indent: "+1" }], // Sangría
        [{ align: [] }], // Alineación
        ["link", "image"], // Enlaces e imágenes
        ["clean"], // Limpiar formato
      ],
    },
  };

  const formats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "indent",
    "align",
    "link",
    "image",
  ];

  return (
    <div className="rich-text-editor">
      <style>{`
        .rich-text-editor .ql-container {
          background-color: #1f2937;
          color: white;
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: #374151;
          min-height: 200px;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
          color: white;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
        .rich-text-editor .ql-toolbar {
          background-color: #111827;
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          border-color: #374151;
          padding: 0.5rem;
        }
        .rich-text-editor .ql-toolbar .ql-stroke {
          stroke: #d1d5db;
        }
        .rich-text-editor .ql-toolbar .ql-fill {
          fill: #d1d5db;
        }
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button.ql-active {
          color: #2093c4;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-stroke,
        .rich-text-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: #2093c4;
        }
        .rich-text-editor .ql-toolbar button:hover .ql-fill,
        .rich-text-editor .ql-toolbar button.ql-active .ql-fill {
          fill: #2093c4;
        }
        .rich-text-editor .ql-snow .ql-picker {
          color: #d1d5db;
        }
        .rich-text-editor .ql-snow .ql-picker-options {
          background-color: #1f2937;
          border-color: #374151;
        }
      `}</style>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
