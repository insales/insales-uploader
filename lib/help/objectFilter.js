export default function objectFilter( obj, predicate) {
    let result = {}, key;

    for (key in obj) {
        if (obj.hasOwnProperty(key) && !predicate(obj[key], key)) {
            result[key] = obj[key];
        }
    }

    return result;
};
