import async from "async";
import moment from "moment";
import { Request, Response, NextFunction } from "express";

import { body, validationResult } from "express-validator/check";
import { sanitizeBody } from "express-validator/filter";

import { default as JobModel, IJob, POSTTYPE_FB, POSTTYPE_NORMAL, Location } from "../models/Job";


import { PageInfo, getNewPageInfo } from "../util/pagination";
import * as selectOption from "../util/selectOption";
import * as backUrl from "../util/backUrl";
import logger from "../util/logger";

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /recruiters
 * Recruiter listing page.
 */
export let getRecruiters = (req: Request, res: Response, next: NextFunction) => {
    let newPageNo: number = parseInt(req.query.newPageNo);
    if (!newPageNo) {
        newPageNo = 1; // default
    }

    let rowPerPage: number = parseInt(req.query.rowPerPage);
    if (!rowPerPage) {
        rowPerPage = DEFAULT_ROW_PER_PAGE; // default
    }

    let pageInfo: PageInfo;

    const item_list = [];
    item_list.push({
        url: "/recruiter/1001",
        name: "Recruiter #1",
        nric: "A0000001",
        email: "some1@e.mail",
        mobileNo: "+60122222221",
        billingName: "Company #1"
    });
    item_list.push({
        url: "/recruiter/1002",
        name: "Recruiter #2",
        nric: "A0000002",
        email: "some2@e.mail",
        mobileNo: "+60122222222",
        billingName: "Company #2"
    });
    item_list.push({
        url: "/recruiter/1003",
        name: "Recruiter #3",
        nric: "A0000003",
        email: "some3@e.mail",
        mobileNo: "+60122222223",
        billingName: "Company #3"
    });
    item_list.push({
        url: "/recruiter/1004",
        name: "Recruiter #4",
        nric: "A0000004",
        email: "some4@e.mail",
        mobileNo: "+60122222224",
        billingName: "Company #4"
    });

    pageInfo = getNewPageInfo(item_list.length, rowPerPage, newPageNo);

    let rowPerPageOptions, pageNoOptions;
    if (pageInfo) {
        rowPerPageOptions = selectOption.OPTIONS_ROW_PER_PAGE();
        selectOption.markSelectedOption(rowPerPage.toString(), rowPerPageOptions);

        pageNoOptions = selectOption.OPTIONS_PAGE_NO(pageInfo.totalPageNo);
        selectOption.markSelectedOption(pageInfo.curPageNo.toString(), pageNoOptions);
    }

    // client side script
    const includeScripts = ["/js/recruiter/list.js", "/js/util/pagination.js"];

    res.render("recruiter/list", {
        title: "Recruiter",
        title2: "Recruiter List",
        item_list: item_list,
        rowPerPageOptions: rowPerPageOptions,
        pageNoOptions: pageNoOptions,
        pageInfo: pageInfo,
        includeScripts: includeScripts
    });

};

