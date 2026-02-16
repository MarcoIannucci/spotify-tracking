import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function eur(n: number) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
}

function monthLabel(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { month: "short", year: "numeric" });
}

export async function exportParticipantPdf(
    name: string,
    monthlyFee: number,
    rows: { month: string; amount_due: number; amount_paid: number }[]
) {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    let y = 800;

    function text(t: string, size = 12, bold = false) {
        page.drawText(t, {
            x: 50,
            y,
            size,
            font,
            color: rgb(0, 0, 0),
        });
        y -= size + 6;
    }

    text("Spotify Premium — Storico pagamenti", 18);
    y -= 10;
    text(`Nome: ${name}`, 12);
    text(`Quota mensile: ${eur(monthlyFee)}`, 12);

    y -= 10;
    text("Mese        Dovuto   Pagato   Mancante", 12);

    let totalDue = 0;
    let totalPaid = 0;

    rows.forEach((r) => {
        const missing = r.amount_due - r.amount_paid;
        totalDue += r.amount_due;
        totalPaid += r.amount_paid;

        text(
            `${monthLabel(r.month).padEnd(10)} ${eur(r.amount_due).padEnd(8)} ${eur(
                r.amount_paid
            ).padEnd(8)} ${eur(Math.max(0, missing))}`,
            11
        );
    });

    y -= 10;
    text(`Totale dovuto: ${eur(totalDue)}`, 12);
    text(`Totale pagato: ${eur(totalPaid)}`, 12);
    text(`Residuo: ${eur(Math.max(0, totalDue - totalPaid))}`, 12);

    const bytes = await pdf.save();
    const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `storico_${name}.pdf`;
    a.click();

    URL.revokeObjectURL(url);

}
