import { toast } from "sonner";

const collectPageStyles = () =>
  Array.from(document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style'))
    .map((node) => {
      if (node instanceof HTMLLinkElement) {
        const href = node.href;
        const media = node.media || "all";
        return `<link rel="stylesheet" href="${href}" media="${media}">`;
      }

      return node.outerHTML;
    })
    .join("\n");

const labelPrintFallbackCss = `
  .clinical-label,
  .clinical-label * {
    box-sizing: border-box !important;
  }

  .clinical-label {
    position: relative !important;
    width: 63.5mm !important;
    height: 46.6mm !important;
    overflow: hidden !important;
    padding: 1.8mm !important;
    color: #000 !important;
    background: #fff !important;
    border: 0.35pt solid #d1d5db !important;
    border-radius: 1.5mm !important;
    font-family: Arial, Helvetica, sans-serif !important;
    box-shadow: none !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  .clinical-label__header {
    border-bottom: 0.35pt solid #d1d5db !important;
    padding-bottom: 1.2mm !important;
  }

  .clinical-label__top {
    display: flex !important;
    align-items: flex-start !important;
    justify-content: space-between !important;
    gap: 1mm !important;
  }

  .clinical-label__title {
    overflow: hidden !important;
    font-size: 9.5px !important;
    font-weight: 800 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .clinical-label__time {
    flex: none !important;
    font-size: 8px !important;
    font-weight: 800 !important;
    line-height: 1 !important;
    text-align: right !important;
    white-space: nowrap !important;
  }

  .clinical-label__patient {
    margin-top: 1.2mm !important;
  }

  .clinical-label__patient-caption,
  .clinical-label__field-label,
  .clinical-label__metric-label {
    font-size: 6.6px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    text-transform: uppercase !important;
  }

  .clinical-label__patient-name {
    margin-top: 0.5mm !important;
    font-size: 11px !important;
    font-weight: 800 !important;
    line-height: 1.05 !important;
    text-transform: uppercase !important;
    overflow-wrap: anywhere !important;
  }

  .clinical-label__meta-grid {
    display: grid !important;
    grid-template-columns: 0.72fr 1.08fr 0.7fr !important;
    gap: 0.8mm !important;
    margin-top: 1mm !important;
  }

  .clinical-label__field,
  .clinical-label__composition,
  .clinical-label__metric {
    border: 0.35pt solid #d1d5db !important;
    border-radius: 1mm !important;
    padding: 0.8mm 1.2mm !important;
  }

  .clinical-label__field-value {
    margin-top: 0.6mm !important;
    font-weight: 800 !important;
    line-height: 1 !important;
  }

  .clinical-label__field-value--bed {
    font-size: 10.5px !important;
  }

  .clinical-label__field-value--dob {
    font-size: 8.4px !important;
  }

  .clinical-label__field-value--route {
    font-size: 9.4px !important;
  }

  .clinical-label__body {
    padding-top: 1.1mm !important;
    padding-bottom: 11.8mm !important;
  }

  .clinical-label__diet {
    margin-bottom: 1mm !important;
    font-size: 8.2px !important;
    line-height: 1.2 !important;
  }

  .clinical-label__composition {
    margin-bottom: 1mm !important;
    font-size: 6.7px !important;
    line-height: 1.15 !important;
    overflow-wrap: anywhere !important;
  }

  .clinical-label__metrics {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 1mm !important;
  }

  .clinical-label__metric {
    padding: 1mm 1.2mm !important;
  }

  .clinical-label__metric-value {
    margin-top: 0.8mm !important;
    font-size: 10.8px !important;
    font-weight: 800 !important;
    line-height: 1 !important;
  }

  .clinical-label__record {
    display: grid !important;
    grid-template-columns: 1fr !important;
    margin-top: 1mm !important;
    font-size: 6.8px !important;
    line-height: 1.15 !important;
  }

  .clinical-label__footer {
    position: absolute !important;
    right: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    padding: 1mm 1.8mm !important;
    border-top: 0.35pt solid #d1d5db !important;
    background: #f8fafc !important;
    font-size: 6.2px !important;
    line-height: 1.15 !important;
  }

  .clinical-label__footer-grid {
    display: grid !important;
    grid-template-columns: 1fr auto !important;
    gap: 1mm !important;
  }

  .clinical-label__footer-left {
    min-width: 0 !important;
  }

  .clinical-label__rt {
    min-width: 22mm !important;
    text-align: right !important;
  }
`;

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
        <base href="${window.location.origin}/" />
        <title>${title}</title>
        ${styles}
        <style>
          body { margin: 0; background: white; color: black; }
          .print\\:hidden { display: none !important; }
          .hidden, .print\\:block { display: block !important; }
          .print\\:grid { display: grid !important; }
          .print\\:flex { display: flex !important; }
          [data-print-popup-root] { display: block !important; }
          .print-label-sheet { width: 196.5mm; margin: 0 auto; }
          .print-label-item { width: 63.5mm; height: 46.6mm; margin: 0; }
          ${labelPrintFallbackCss}
          @page {
            size: A4 portrait;
            margin: 5mm;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              background: white !important;
            }
            .print-label-sheet {
              display: grid !important;
              grid-template-columns: repeat(3, 63.5mm);
              column-gap: 3mm !important;
              row-gap: 0 !important;
              width: 196.5mm;
              margin: 0 auto;
            }
            .print-label-item {
              width: 63.5mm;
              height: 46.6mm;
              margin: 0 !important;
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main data-print-popup-root>
          ${element.outerHTML}
        </main>
        <script>
          function waitForStylesheets() {
            var links = Array.prototype.slice.call(document.querySelectorAll('link[rel="stylesheet"]'));
            return Promise.all(links.map(function (link) {
              try {
                if (link.sheet) return Promise.resolve();
              } catch (error) {}

              return new Promise(function (resolve) {
                var done = false;
                var finish = function () {
                  if (done) return;
                  done = true;
                  resolve();
                };

                link.addEventListener("load", finish, { once: true });
                link.addEventListener("error", finish, { once: true });
                setTimeout(finish, 1800);
              });
            }));
          }

          function waitForImages() {
            var images = Array.prototype.slice.call(document.images || []);
            return Promise.all(images.map(function (image) {
              if (image.complete) return Promise.resolve();
              if (image.decode) return image.decode().catch(function () {});

              return new Promise(function (resolve) {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              });
            }));
          }

          function waitForFonts() {
            if (!document.fonts || !document.fonts.ready) return Promise.resolve();
            return document.fonts.ready.catch(function () {});
          }

          function readyToPrint() {
            return Promise.race([
              Promise.all([waitForStylesheets(), waitForImages(), waitForFonts()]),
              new Promise(function (resolve) { setTimeout(resolve, 2500); })
            ]).then(function () {
              window.focus();
              window.print();
            });
          }

          if (document.readyState === "complete") {
            setTimeout(readyToPrint, 50);
          } else {
            window.addEventListener("load", function () {
              setTimeout(readyToPrint, 50);
            }, { once: true });
          }
        </script>
      </body>
    </html>
  `);
  popup.document.close();
};
