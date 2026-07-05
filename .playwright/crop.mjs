import sharp from "sharp";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/6f6366ba-e682-42c0-9027-634280f53e3f/scratchpad";
await sharp(`${shots}/1-added-folder.png`).extract({ left: 0, top: 0, width: 1280, height: 700 }).toFile(`${shots}/1-crop.png`);
