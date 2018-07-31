export type PageInfo = {
    totalRow: number,
    rowPerPage: number,
    curPageNo: number,
    totalPageNo: number,
    rowNoStart: number,
    rowNoEnd: number,
    hasPrevPage: boolean,
    hasNextPage: boolean
};

export function getNewPageInfo(totalRow: number, rowPerPage: number, newPageNo: number) {
    const result = { hasPrevPage: false, hasNextPage: false } as PageInfo;
    result.totalRow = totalRow;
    result.rowPerPage = rowPerPage;

    if (totalRow > 0 && rowPerPage > 0 && newPageNo > 0) {
        result.totalPageNo = Math.ceil(totalRow / rowPerPage);
        result.curPageNo = newPageNo > result.totalPageNo ? result.totalPageNo : newPageNo;
        result.rowNoStart = ((result.curPageNo - 1) * result.rowPerPage) + 1;
        result.rowNoEnd = result.rowNoStart + result.rowPerPage - 1;
        if (result.rowNoEnd > result.totalRow) {
            result.rowNoEnd = result.totalRow;
        }
        if (result.rowNoStart > result.rowPerPage) {
            result.hasPrevPage = true;
        }
        if (result.rowNoEnd < result.totalRow) {
            result.hasNextPage = true;
        }
    } else {
        result.totalPageNo = 0;
        result.curPageNo = 0;
        result.rowNoStart = 0;
        result.rowNoEnd = 0;
    }

    return result;
}