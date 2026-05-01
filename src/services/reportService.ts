import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VictimaJEP, ExpedienteJEP } from '../types/jep';

export const reportService = {
  async generarInformeCaso(expediente: ExpedienteJEP, victimas: VictimaJEP[]) {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString();

    // Encabezado Institucional
    doc.setFontSize(18);
    doc.text("IIRESODH - SISTEMA SIGEL", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text("Informe Técnico de Caracterización de Víctimas", 105, 30, { align: 'center' });
    doc.text(`Macrocaso: ${expediente.macrocaso} | Radicado: ${expediente.codigoExpediente}`, 105, 40, { align: 'center' });
    
    doc.line(20, 45, 190, 45);

    // Resumen del Caso
    doc.setFontSize(10);
    doc.text("Resumen de Hechos:", 20, 55);
    const splitText = doc.splitTextToSize(expediente.resumenHechos, 170);
    doc.text(splitText, 20, 60);

    // Tabla de Víctimas Vinculadas
    autoTable(doc, {
      startY: 80,
      head: [['Nombre Completo', 'Documento', 'Ubicación', 'Estado JEP']],
      body: victimas.map(v => [
        v.nombreCompleto,
        v.documentoIdentidad,
        `${v.municipio}, ${v.departamento}`,
        v.estadoAcreditacion
      ]),
      headStyles: { fillColor: [26, 54, 93] }, // Azul Institucional
    });

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Generado el: ${fecha} - Confidencial IIRESODH`, 105, 285, { align: 'center' });
    }

    doc.save(`Informe_${expediente.codigoExpediente}.pdf`);
  }
};