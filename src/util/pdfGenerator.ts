import { Response } from "express";
import puppeteer from "puppeteer";
import * as pug from "pug";
import * as sass from "node-sass";

import { Logger } from "./logger";
const logger = new Logger("util.pdfGenerator");

export interface TemplateOptions {
    templatePath: string;
    stylePath?: string;
    pdfOptions: puppeteer.PDFOptions;
}

export class PdfGenerator {
    static browser: puppeteer.Browser = undefined;

    static async sendPdfGivenPageUrl(res: Response, targetPageUrl: string) {
        if (!PdfGenerator.browser) {
            logger.debug("init PdfGenerator.browser");
            PdfGenerator.browser = await puppeteer.launch({args: ["--proxy-server='direct://'", "--proxy-bypass-list=*"]});
        }
        const page = await PdfGenerator.browser.newPage();
        const response = await page.goto(targetPageUrl, {
            waitUntil: ["load", "domcontentloaded", "networkidle0"],
        });
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
        });
        res.send(pdfBuffer);
        await page.close();
    }

    static async sendPdfGivenTemplatePath(res: Response, templateOptions: TemplateOptions, localsObject: pug.Options & pug.LocalsObject) {
        if (!PdfGenerator.browser) {
            PdfGenerator.browser = await puppeteer.launch({args: ["--proxy-server='direct://'", "--proxy-bypass-list=*"]});
        }
        const page = await PdfGenerator.browser.newPage();
        let htmlTemplateOptions: pug.Options & pug.LocalsObject = {...localsObject};

        if (templateOptions.stylePath) {
            const compiledStyle = sass.renderSync({ file: templateOptions.stylePath });

            htmlTemplateOptions = {
                ...htmlTemplateOptions,
                compiledStyle: compiledStyle.css,
            };
        }

        const renderedTemplate = pug.renderFile(templateOptions.templatePath, htmlTemplateOptions);
        // logger.debug("renderedTemplate: " + renderedTemplate);
        // const response = await page.goto(`data:text/html, ${renderedTemplate}`, {
        //     waitUntil: ["load", "domcontentloaded", "networkidle0"],
        // });
        // Use this to support displaying special character "#"
        await page.setContent(renderedTemplate, {
            waitUntil: ["load", "domcontentloaded", "networkidle0"],
        });
        // logger.debug("page.content: " + await page.content());
        // res.send(await page.content());
        const pdfBuffer = await page.pdf(templateOptions.pdfOptions);
        res.send(pdfBuffer);
        await page.close();
    }
}
