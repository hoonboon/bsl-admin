"use strict";

import { Response, Request, NextFunction } from "express";
import { Logger } from "../util/logger";
import RecruiterModel from "../models/Recruiter";
import { PageInfo, getNewPageInfo } from "../util/pagination";

const logger = new Logger("controllers.recruiter");

const DEFAULT_ROW_PER_PAGE: number = 10;

/**
 * GET /api/recruiters
 * return Recruiter listing.
 */
export let getRecruiters = (req: Request, res: Response, next: NextFunction) => {
    const searchStr: string = req.query.q;

    let newPageNo: number = parseInt(req.query.newPageNo);
    if (!newPageNo) {
        newPageNo = 1; // default
    }

    let rowPerPage: number = parseInt(req.query.rowPerPage);
    if (!rowPerPage) {
        rowPerPage = DEFAULT_ROW_PER_PAGE; // default
    }

    const query = RecruiterModel.find();

    // filter records
    if (searchStr) {
        query.or([
          { "name": { $regex: searchStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") , $options : "i" } },
          { "email": { $regex: searchStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&") , $options : "i" } },
        ]);
    }

    query.where("status").equals("A");

    let pageInfo: PageInfo;

    query.count()
    .then(function(count: number) {
      if (count > 0) {
          pageInfo = getNewPageInfo(count, rowPerPage, newPageNo);

          query.find();
          query.select("name email mobileNo _id");
          query.skip(pageInfo.rowNoStart - 1);
          query.limit(rowPerPage);
          query.sort([["name", "ascending"], ["createdAt", "descending"]]);
          return query.exec();
      } else {
          Promise.resolve();
      }
    })
    .then(function (item_list: any) {
      let results = [];
      if (item_list)
        results = item_list;
      return res.json(results);
    })
    .catch(function(error) {
        console.error(error);
        return next(error);
    });

};
