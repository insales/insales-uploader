export default function objectFilter( obj, predicate) {
    let result = {}, key;

    for (key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && !predicate(obj[key], key)) {
            result[key] = obj[key];
        }
    }

    return result;
};
