/*jslint
    node, unordered
*/
/*property
    apply_fallback, apply_parallel, apply_parallel_object, apply_race, catch,
    constant, create, do_nothing, fallback, forEach, freeze, if_else, keys,
    make_requestor_factory, map, parallel, parallel_object,
    promise_requestorize, race, reason, requestorize, then, value, when,
    wrap_reason, wrap_requestor
*/
import parseq from "./parseq.js";

function delay(ms) {
    return function (unary) {
        return function delay_requestor(cb, v) {
            const id = setTimeout(function (v) {
                let result;
                try {
                    result = unary(v);
                } catch (error) {
                    return cb(undefined, error);
                }
                return cb(result);
            }, ms, v);
            return function () {
                clearTimeout(id);
            };
        };
    };
}

const requestorize = delay(0);
const do_nothing = requestorize((v) => v);
const constant = (c) => requestorize(() => c);

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

function make_requestor_factory(unary) {
    return wrap_requestor(requestorize(unary));
}

function promise_requestorize(promise, action = "executing promise") {
    return function (callback) {
        let is_called = false;
        function promise_callback(value, reason) {
            if (!is_called) {
                is_called = true;
                if (value === undefined) {
                    const err = new Error(`Failed when ${action}`);
                    err.evidence = reason;
                    return callback(undefined, err);
                }
                return callback(value);
            }
            throw reason || `Callback failed when ${action}`;
        }
        promise.then(promise_callback).catch(function (e) {
            promise_callback(undefined, e);
        });
    };
}

function dynamic_import(url) {
    return promise_requestorize(import(url), `importing ${url}`);
}

function dynamic_default_import(url) {
    return parseq.sequence([
        dynamic_import(url),
        requestorize((m) => m["default"])
    ]);
}

function factory(requestor, adapter) {
    return parseq.sequence([
        requestorize(adapter),
        requestor
    ]);
}

export default Object.freeze({
    ...parseq,
    wrap_reason,
    constant,
    wrap_requestor,
    requestorize,
    make_requestor_factory,
    promise_requestorize,
    do_nothing,
    when,
    if_else,
    apply_race,
    apply_fallback,
    apply_parallel,
    apply_parallel_object,
    dynamic_default_import,
    dynamic_import,
    delay,
    factory
});
