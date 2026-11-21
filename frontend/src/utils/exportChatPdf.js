import { jsPDF } from 'jspdf';

export function downloadConversationPdf(agent, conversation) {
  if (!agent || !conversation || conversation.length === 0) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const maxWidth = pageWidth - margin * 2;
  let y = 52;

  const ensureSpace = (needed = 24) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = 52;
    }
  };

  doc.setFillColor(79, 70, 229);
  doc.rect(0, 0, pageWidth, 10, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`AI Role Agents - ${agent.title}`, margin, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported on ${new Date().toLocaleString()}  |  https://vercel.app`, margin, y);
  y += 20;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  conversation.forEach((msg) => {
    const isUser = msg.role === 'user';
    const speaker = isUser ? 'You' : `${agent.title} Agent`;
    const timeStr = msg.ts ? new Date(msg.ts).toLocaleTimeString() : '';

    ensureSpace(44);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(isUser ? 30 : 79, isUser ? 41 : 70, isUser ? 59 : 229);
    doc.text(`${speaker}${timeStr ? `  (${timeStr})` : ''}`, margin, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);

    const cleanText = (msg.content || '')
      .replace(/```mermaid[\s\S]*?```/g, '[Workflow Diagram]')
      .replace(/```[a-zA-Z]*\n?/g, '')
      .replace(/```/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/#{1,6}\s+/g, '');

    const lines = doc.splitTextToSize(cleanText, maxWidth);
    lines.forEach((line) => {
      ensureSpace(15);
      doc.text(line, margin, y);
      y += 14;
    });
    y += 14;
  });

  const slug = (agent.role || 'agent').replace(/[^a-z0-9_-]/gi, '-');
  doc.save(`ai-role-agents-${slug}-chat.pdf`);
}
