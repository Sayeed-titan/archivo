import sharp from "sharp";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/6f6366ba-e682-42c0-9027-634280f53e3f/scratchpad";
await sharp(`${shots}/2-rules-dialog-open.png`).extract({ left: 300, top: 300, width: 700, height: 700 }).toFile(`${shots}/2-crop.png`);
