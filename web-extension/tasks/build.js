import fs from "fs";
import app from "../package.json" with {type: "json"};

const base = "./node_modules/";

app.import.forEach(function (file) {
    const filename = file.split("/").pop();
    fs.copyFileSync(base + file, "./libs/" + filename);
});
