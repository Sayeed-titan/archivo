import sharp from "sharp";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/6f6366ba-e682-42c0-9027-634280f53e3f/scratchpad";
const meta = await sharp(`${shots}/1-added-folder.png`).metadata();
console.log(meta.width, meta.height);
await sharp(`${shots}/1-added-folder.png`).extract({ left: 0, top: 750, width: 1280, height: 700 }).toFile(`${shots}/1-crop2.png`);
