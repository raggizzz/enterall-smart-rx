import { toast } from "sonner";

const collectPageStyles = () =>
  Array.from(document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join("\n");

export const createPrintPopup = (title = "Documento para impressão"): Window | null => {
  if (typeof window === "undefined") return null;

  const popup = window.open("", "_blank", "width=1100,height=800");
  if (!popup) {
    toast.error("O navegador bloqueou o pop-up. Libere pop-ups para gerar o PDF em nova janela.");
    return null;
  }

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }
        </style>
      </head>
      <body>
        <p>Preparando documento para impressão...</p>
      </body>
    </html>
  `);
  popup.document.close();
  return popup;
};

export const printElementInPopup = (elementId: string, title = "Documento para impressão", targetWindow?: Window | null) => {
  if (typeof window === "undefined") return;

  const element = document.getElementById(elementId);
  if (!element) {
    toast.error("Não foi possível localizar o documento para impressão.");
    targetWindow?.close();
    return;
  }

  const popup = targetWindow || createPrintPopup(title);
  if (!popup) {
    return;
  }

  const styles = collectPageStyles();
  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        ${styles}
        <style>
          body { margin: 0; background: white; color: black; }
          .print\\:hidden { display: none !important; }
          .hidden, .print\\:block { display: block !important; }
          .print\\:grid { display: grid !important; }
          .print\\:flex { display: flex !important; }
          [data-print-popup-root] { display: block !important; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <main data-print-popup-root>
          ${element.outerHTML}
        </main>
        <script>
          window.addEventListener("load", function () {
            setTimeout(function () {
              window.focus();
              window.print();
            }, 250);
          });
        </script>
      </body>
    </html>
  `);
  popup.document.close();
};
