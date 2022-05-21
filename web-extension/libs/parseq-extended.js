/*jslint
    node, unordered
*/
/*property
    apply_fallback, apply_parallel, apply_parallel_object, apply_race, constant,
    create, do_nothing, fallback, forEach, freeze, if_else, keys, map, parallel,
    parallel_object, race, reason, requestorize, value, when, wrap_reason,
    wrap_requestor
*/
import parseq from "./parseq.js";

function do_nothing(cb, v) {
    return cb(v);
}

function constant(v) {
    return function requestor_constant(callback) {
        return callback(v);
    };
}

function if_else(condition, requestor_if, requestor_else) {
    return function (callback, value) {
        if (condition(value)) {
            return requestor_if(callback, value);
        }
        return requestor_else(callback, value);
    };
}

function when(condition, requestor) {
    return if_else(condition, requestor, do_nothing);
}

function requestorize(unary) {
    return function requestor(callback, value) {
        try {
            return callback(unary(value));
        } catch (exception) {
            return callback(undefined, exception);
        }
    };
}

function wrap_reason(requestor) {
    return function (callback, value) {
        return requestor(function (value, reason) {
            return callback({value, reason});
        }, value);
    };
}

function apply_race(
    requestor_factory,
    time_limit,
    throttle
) {
    return function (callback, value) {
        try {
            return parseq.race(
                value.map(requestor_factory),
                time_limit,
                throttle
            )(callback);
        } catch (e) {
            return callback(undefined, e);
        }
    };
}

function apply_fallback(
    requestor_factory,
    time_limit
) {
    return function (callback, value) {
        try {
            return parseq.fallback(
                value.map(requestor_factory),
                time_limit
            )(callback);
        } catch (e) {
            return callback(undefined, e);
        }
    };
}

function apply_parallel(
    requestor_factory,
    optional_requestor_factory,
    time_limit,
    time_option,
    throttle
) {
    return function (callback, value) {
        try {
            return parseq.parallel(
                value.map(requestor_factory),
                (
                    typeof optional_requestor_factory === "function"
                    ? value.map(optional_requestor_factory)
                    : []
                ),
                time_limit,
                time_option,
                throttle
            )(callback);
        } catch (e) {
            return callback(undefined, e);
        }
    };
}

function wrap_requestor(requestor) {
    return function (value) {
        return function (callback) {
            return requestor(callback, value);
        };
    };
}

function apply_parallel_object(
    requestor_factory,
    time_limit,
    time_option,
    throttle
) {
    return function (callback, value) {
        try {
            const keys = Object.keys(value);
            const required_obj_requestor = Object.create(null);
            keys.forEach(function (key) {
                required_obj_requestor[key] = requestor_factory(value[key]);
            });
            return parseq.parallel_object(
                required_obj_requestor,
                undefined,
                time_limit,
                time_option,
                throttle
            )(callback);

        } catch (e) {
            return callback(undefined, e);
        }
    };
}

export default Object.freeze({
    ...parseq,
    wrap_reason,
    constant,
    wrap_requestor,
    requestorize,
    do_nothing,
    when,
    if_else,
    apply_race,
    apply_fallback,
    apply_parallel,
    apply_parallel_object
});
