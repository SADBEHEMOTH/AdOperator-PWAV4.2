import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportToPdf(elementId, filename = "adoperator-export") {
  const element = document.getElementById(elementId);
  if (!element) return;

  const originalBg = element.style.backgroundColor;
  element.style.backgroundColor = "#09090b";

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: "#09090b",
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height in mm

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save(`${filename}.pdf`);
  } finally {
    element.style.backgroundColor = originalBg;
  }
}
