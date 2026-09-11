import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import { embedCertificateFont } from "@/lib/pdf-font";

type Input = { certificateCode: string; orderCode: string; name: string; username: string; platform: string; plan: string; startsAt: string; endsAt: string };
const date = (value: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));

export async function createTelegramWarrantyPdf(input: Input) {
  const pdf = await PDFDocument.create();
  const font = await embedCertificateFont(pdf);
  const logo = await pdf.embedPng(await readFile(join(process.cwd(), "public/logo/tiger-store.png")));
  const ink = rgb(.1,.08,.07);
  const orange = rgb(1,.45,0);
  const makePage = () => {
    const p = pdf.addPage([595,842]);
    p.drawRectangle({ x:0,y:0,width:595,height:842,color:rgb(1,.972,.94) });
    p.drawRectangle({ x:28,y:28,width:539,height:786,borderColor:orange,borderWidth:1.2 });
    p.drawRectangle({ x:28,y:704,width:539,height:110,color:ink });
    p.drawText("CERTIFICAT DE GARANTIE", { x:52,y:751,size:16,font,color:orange });
    p.drawText("Tiger Store — abonnement Snapchat", { x:52,y:724,size:10,font,color:rgb(.95,.9,.85) });
    const dims = logo.scale(65 / logo.width);
    p.drawImage(logo,{ x:476,y:731,width:dims.width,height:dims.height });
    return p;
  };
  let page = makePage();
  let y = 672;
  const lines = (value: string, width: number, size: number) => {
    const result: string[] = [];
    let line = "";
    for (const char of value.replace(/[\r\n\t\u0000-\u001f]/g," ")) {
      if (line && font.widthOfTextAtSize(line+char,size)>width) { result.push(line); line=""; }
      line += char;
    }
    if (line) result.push(line);
    return result;
  };
  const rows = [["NUMÉRO DE COMMANDE",input.orderCode],["CLIENT",input.name],["NOM D’UTILISATEUR",input.username],["PLATEFORME D’ACTIVATION",input.platform],["FORMULE",input.plan],["DATE DE DÉBUT",date(input.startsAt)],["DATE D’EXPIRATION",date(input.endsAt)],["CODE CERTIFICAT",input.certificateCode]];
  for (const [label,value] of rows) {
    const wrapped = lines(value,300,12);
    const height = Math.max(40,wrapped.length*20+18);
    if (y-height < 230) { page=makePage(); y=672; }
    page.drawText(label,{x:52,y,size:8,font,color:rgb(.42,.36,.31)});
    wrapped.forEach((line,i) => page.drawText(line,{x:230,y:y-i*20,size:12,font,color:ink}));
    y-=height;
    page.drawLine({start:{x:52,y:y+12},end:{x:543,y:y+12},thickness:.45,color:rgb(.86,.8,.73)});
  }
  page.drawText("Conditions de garantie",{x:52,y:199,size:13,font,color:ink});
  let termsY=174;
  for (const term of ["En cas de panne couverte imputable à Tiger Store, un remplacement est tenté en premier.","Si le remplacement est impossible, la période de garantie non utilisée est remboursée au prorata.","Les problèmes causés par le client ne sont pas couverts."]) {
    for (const line of lines(`• ${term}`,491,9)) { page.drawText(line,{x:52,y:termsY,size:9,font,color:ink}); termsY-=16; }
    termsY-=4;
  }
  return pdf.save();
}
