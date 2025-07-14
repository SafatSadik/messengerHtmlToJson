import fs from 'fs/promises';
import path from 'path';
import { JSDOM } from "jsdom"



export default async function messengerHtmlToJson(inputFile ,outputDir = null ,date = true,iso = false) {

    try {
        const data = await fs.readFile(inputFile, 'utf-8');

        const dom = new JSDOM(data)
        const document = dom.window.document

        const main = document.querySelector(`div[role="main"]`)
        main.removeChild(main.firstElementChild)

        let dataArray = []
        main.childNodes.forEach(node => {
            if (node.nodeType === 1) {
                const chatblock = {}
                const namechild = node.firstElementChild;
                const datechild = node.childNodes[2];
                const messagechild = node.childNodes[3];

                if (datechild) {
                    const date = node.children[2].textContent.trim()
                    chatblock['date'] = date
                }

                if (namechild) {
                    const name = namechild.textContent.trim().toLowerCase()
                    chatblock['name'] = name
                }
                if (messagechild) {
                    if (messagechild.querySelector("a")) {
                        const href = messagechild.querySelector('a').getAttribute("href")
                        if (getMediaType(href) == "link") {
                            chatblock['message'] = `website link (${href})`
                        } else if (getMediaType(href) == "image") {
                            chatblock['message'] = `image`
                        } else if (getMediaType(href) == "video") {
                            chatblock['message'] = `video`
                        }
                    } else {
                        const message = messagechild.textContent.trim()
                        chatblock['message'] = message
                    }

                }
                dataArray.push(chatblock)
            }

        });


        function getMediaType(filename) {
            const lower = filename.toLowerCase();

            const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'];
            const videoExts = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.mpeg'];

            if (imageExts.some(ext => lower.endsWith(ext))) {
                return 'image';
            }
            if (videoExts.some(ext => lower.endsWith(ext))) {
                return 'video';
            }
            return 'link';
        }

        function fixAndParse(dateStr) {
            // Insert a space before am/pm to make it parseable
            const fixed = dateStr.replace(/(\d{1,2}:\d{2}:\d{2})(am|pm)/i, '$1 $2');
            const parsed = new Date(fixed);
            if (isNaN(parsed)) {
                throw new Error("Invalid date: " + dateStr);
            }
            return parsed.toISOString();
        }


        dataArray.forEach(item => {
            item.iso = fixAndParse(item.date);
        });

        dataArray.sort((a, b) => a.iso.localeCompare(b.iso));

        if(!iso){
            dataArray.forEach(item => delete item.iso);
        }
        if(!date){
            dataArray.forEach(item => delete item.date);
        }
        const jsondata = JSON.stringify(dataArray)

        

        // Get the original filename without extension
        const fileName = path.basename(inputFile, path.extname(inputFile));
        const inputDir = path.dirname(inputFile);
        const finalOutputDir = outputDir || inputDir;

        const outputFilePath = path.join(finalOutputDir, `${fileName}.json`);
        await fs.mkdir(finalOutputDir, { recursive: true });
        await fs.writeFile(outputFilePath,jsondata , err => {
            console.error('❌ Error:', err.message);
        })
        console.log(`Done extracting \n ✅ File saved at: ${outputFilePath}`)
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}


