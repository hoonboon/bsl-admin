
export function decodeBackUrl(buEncoded: string): string {
    let result: string = buEncoded;
    if (result) {
        result = Buffer.from(result, "base64").toString("binary");
    }
    // logger.debug(`buEncoded: ${buEncoded}, result: ${result}`);
    return result;
}