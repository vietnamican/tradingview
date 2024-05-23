function range(start, end, step) {
    var range = [];
    var typeofStart = typeof start;
    var typeofEnd = typeof end;

    if (step === 0) {
        throw TypeError("Step cannot be zero.");
    }

    if (typeofStart == "undefined" || typeofEnd == "undefined") {
        throw TypeError("Must pass start and end arguments.");
    } else if (typeofStart != typeofEnd) {
        throw TypeError("Start and end arguments must be of same type.");
    }

    typeof step == "undefined" && (step = 1);

    // if (end < start) {
    //     step = -step;
    // }

    if (typeofStart == "number") {

        while (step > 0 ? end > start : end < start) {
            range.push(start);
            start += step;
        }

    } else if (typeofStart == "string") {

        if (start.length != 1 || end.length != 1) {
            throw TypeError("Only strings with one character are supported.");
        }

        start = start.charCodeAt(0);
        end = end.charCodeAt(0);

        while (step > 0 ? end >= start : end <= start) {
            range.push(String.fromCharCode(start));
            start += step;
        }

    } else {
        throw TypeError("Only string and number types are supported");
    }

    return range;

}

function isWholeDay(unixTime) {
    // Chuyển đổi thời gian Unix thành đối tượng Date
    const date = new Date(unixTime);

    // Kiểm tra xem giờ, phút, giây, và mili giây có bằng 0 hay không
    return date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

function isWholeHour(unixTime) {
    // Chuyển đổi thời gian Unix thành đối tượng Date
    const date = new Date(unixTime);

    // Kiểm tra xem giờ, phút, giây, và mili giây có bằng 0 hay không
    return date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

function isWholeMinute(unixTime) {
    // Chuyển đổi thời gian Unix thành đối tượng Date
    const date = new Date(unixTime);

    // Kiểm tra xem giờ, phút, giây, và mili giây có bằng 0 hay không
    return date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

module.exports = {
    range,
    isWholeDay,
    isWholeHour,
    isWholeMinute
};