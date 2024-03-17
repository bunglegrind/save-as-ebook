/*jslint
    unordered
*/
/*global
    setTimeout, clearTimeout
*/
/*property
    adapters, apply_fallback, apply_parallel, apply_parallel_object, apply_race,
    assign, catch, check_callback, check_requestors, constant, create, default,
    delay, do_nothing, dynamic_default_import, dynamic_import, evidence,
    factory_maker, fallback, forEach, freeze, if_else, isArray, keys, length,
    make_reason, make_requestor_factory, map, obj_factories, parallel,
    parallel_merge, parallel_object, promise_requestorize, race, reason, reduce,
    requestorize, sequence, slice, stringify, tap, then, try_catcher, value,
    when, wrap_reason
*/

import parseq from "./parseq.js";

function json_stringify(value) {
    return JSON.stringify(
        value,
        (ignore, v) => (
            v === undefined
            ? "undefined"
            : v
        )
    );
}

function try_catcher(requestor, name = "try-catcher") {
    return function (callback, value) {
        try {
            return requestor(callback, value);
        } catch (e) {
            return callback(
                undefined,
                parseq.make_reason(
                    name,
                    (
                        `catched requestor error `
                        + `${json_stringify(value).slice(0, 200)}`
                    ),
                    e
                )
            );
        }
    };
}

function check_unary(f, name) {
    if (typeof f !== "function" || f.length > 1) {
        throw parseq.make_reason(
            name,
            "Not a unary function",
            f
        );
    }
}

function delay(ms, name = "delay") {
    return function (unary, factory_name = name) {
        check_unary(unary, factory_name);
        return function delay_requestor(callback, v) {
            parseq.check_callback(callback, factory_name);
            const id = setTimeout(function (v) {
                let result;
                try {
                    result = unary(v);
                } catch (error) {
                    return callback(
                        undefined,
                        parseq.make_reason(
                            name,
                            (
                                `catched error in ${factory_name} with value `
                                + `${json_stringify(v).slice(0, 200)}`
                            ),
                            error
                        )
                    );
                }
                return callback(result);
            }, ms, v);

            return function () {
                clearTimeout(id);
            };
        };
    };
}

const requestorize = delay(0, "requestorize");
const do_nothing = requestorize((v) => v, "do_nothing");
const constant = (c) => requestorize(() => c, `constant ${json_stringify(c)}`);

function if_else(condition, requestor_if, requestor_else, name = "if_else") {
    check_unary(condition, name);
    parseq.check_requestors([requestor_if, requestor_else], name);

    return function (callback, value) {
        parseq.check_callback(callback, name);
        if (condition(value)) {
            return requestor_if(callback, value);
        }
        return requestor_else(callback, value);
    };
}

function when(condition, requestor, name = "when") {
    return if_else(condition, requestor, do_nothing, name);
}

function wrap_reason(requestor, name = "wrap_reason") {
    parseq.check_requestors([requestor]);

    return function (callback, value) {
        parseq.check_callback(callback, name);
        return requestor(function (value, reason) {
            return callback({value, reason});
        }, value);
    };
}

function apply_race(
    requestor_factory,
    time_limit,
    throttle,
    name = "apply_race"
) {
    return function (callback, value) {
        if (!Array.isArray(value)) {
            return callback(undefined, parseq.make_reason(
                name,
                "Value is not an array",
                value
            ));
        }
        parseq.check_callback(callback, name);
        return try_catcher(parseq.race(
            value.map(requestor_factory),
            time_limit,
            throttle
        ), name)(callback);
    };
}

function apply_fallback(
    requestor_factory,
    time_limit,
    name = "apply_fallback"
) {
    return function (callback, value) {
        if (!Array.isArray(value)) {
            return callback(undefined, parseq.make_reason(
                name,
                "Value is not an array",
                value
            ));
        }
        parseq.check_callback(callback, name);
        return try_catcher(parseq.fallback(
            value.map(requestor_factory),
            time_limit
        ), name)(callback);
    };
}

function apply_parallel(
    requestor_factory,
    optional_requestor_factory,
    time_limit,
    time_option,
    throttle,
    name = "apply_parallel"
) {
    return function (callback, value) {
        if (!Array.isArray(value)) {
            return callback(undefined, parseq.make_reason(
                name,
                "Value is not an array",
                value
            ));
        }
        parseq.check_callback(callback, name);
        return try_catcher(parseq.parallel(
            value.map(requestor_factory),
            (
                typeof optional_requestor_factory === "function"
                ? value.map(optional_requestor_factory)
                : []
            ),
            time_limit,
            time_option,
            throttle
        ), name)(callback);
    };
}

function apply_parallel_object(
    requestor_factory,
    time_limit,
    time_option,
    throttle,
    name = "apply_parallel_object"
) {
    return try_catcher(function (callback, value) {
        if (typeof value !== "object") {
            return callback(undefined, parseq.make_reason(
                name,
                "Value is not an object",
                value
            ));
        }
        parseq.check_callback(callback, name);
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
    }, name);
}

function parallel_merge(
    obj,
    opt_obj,
    time_limit,
    time_option,
    throttle,
    name = "parallel_merge"
) {
    if (typeof obj !== "object") {
        throw parseq.make_reason(
            name,
            "obj is not an object",
            obj
        );
    }
    return function parallel_merge_requestor(callback, value) {
        parseq.check_callback(callback, name);
        return parseq.sequence([
            parseq.parallel_object(
                obj,
                opt_obj,
                time_limit,
                time_option,
                throttle
            ),
            requestorize(function (to_merge) {
                return Object.assign(
                    Object.create(null),
                    value,
                    to_merge
                );
            })
        ])(callback, value);
    };
}

const is_thunk = (f) => typeof f === "function" && !f.length;
const is_promise = (p) => typeof p?.then === "function";

function promise_requestorize(
    promise_thunk,
    action = "executing promise",
    cancel = undefined
) {
    if (!is_thunk(promise_thunk)) {
        throw parseq.make_reason(
            action,
            `Not a thunk when ${action}`,
            promise_thunk
        );
    }

    return function (callback) {
        parseq.check_callback(callback, action);
        let is_called = false;
        function promise_callback(value, reason) {
            if (!is_called) {
                is_called = true;
                if (value === undefined) {
                    return callback(
                        undefined,

// first callback call: promise has thrown

                        parseq.make_reason(
                            "promise_requestorize",
                            `Failed when ${action}`,
                            reason
                        )
                    );
                }
                return callback(value);
            }

// second callback call: callback has thrown

            throw parseq.make_reason(
                action,
                `Callback failed when ${action}`,
                reason
            );
        }
        const promise = promise_thunk();
        if (!is_promise(promise)) {
            return promise_callback(
                undefined,
                parseq.make_reason(
                    action,
                    `Not a promise when ${action}`,
                    promise
                )
            );
        }
        promise.then(promise_callback).catch(function (e) {

// at this point we still don't know if the promise or the callback has thrown

            promise_callback(
                undefined,
                e
            );
        });
        if (typeof cancel === "function") {
            return cancel;
        }
    };
}

function dynamic_import(url) {
    return promise_requestorize(function () {
        return import(url);
    }, `importing ${url}`);
}

function dynamic_default_import(url) {
    return parseq.sequence([
        dynamic_import(url),
        requestorize((m) => m.default)
    ]);
}

function factory_maker(requestor, factory_name = "factory") {
    parseq.check_requestors([requestor], factory_name);

// the adapter combines the online value passed to the requestor with the
// closure/context in which the factory is executed
// its return value is passed to the requestor

    return function factory(adapter) {

// a default adapter is provided in order to manage the most common cases

        function default_adapter(precomputed) {
            return function (value) {

// default: both values are object, so we give the requestor their merge

                if (
                    typeof precomputed === "object"
                    && !Array.isArray(precomputed)
                ) {
                    return Object.assign(
                        Object.create(null),
                        precomputed,
                        value
                    );
                }

// otherwise, default behavior is to provide only the precomputed value
// in order to have a simple make_requestor_factory unless it's nil

                return precomputed ?? value;
            };
        }

        if (typeof adapter !== "function") {
            adapter = default_adapter(adapter);
        }
        return parseq.sequence([
            requestorize(adapter),
            requestor
        ]);
    };
}

function make_requestor_factory(unary) {
    return factory_maker(requestorize(unary));
}

function tap(requestor) {
    return function (cb, value) {
        return requestor(function (v, reason) {
            if (v === undefined) {
                return cb(undefined, reason);
            }
            return cb(value);
        }, value);
    };
}

function reduce(
    reducer,
    initial_value,
    requestor_array,
    throttle
) {
    // throttle = throttle || requestor_array.length;
    // let i = 0;
    // let acc = initial_value;
    // let requestors = [];

    // while (i * throttle < requestor_array.length) {
    //     requestors = requestors.concat([
    //         parseq.parallel(
    //             requestor_array.slice(i * throttle, (i + 1) * throttle)
    //         ),
    //         requestorize(function (array) {
    //             acc = array.reduce(reducer, acc);
    //             return acc;
    //         })
    //     ]);

    //     i += 1;
    // };
    // requestors.push(do_nothing);
    // return parseq.sequence(requestors);

    throttle = throttle || requestor_array.length;
    return parseq.sequence([
        parseq.parallel(requestor_array.slice(0, throttle)),
        requestorize(function (array) {
            return array.reduce(reducer, initial_value);
        }),
        if_else(
            () => throttle >= requestor_array.length,
            do_nothing,
            (callback, value) => reduce(
                reducer,
                value,
                requestor_array.slice(throttle),
                throttle
            )(callback, value)
        )
    ]);
}

export default Object.freeze({
    sequence: parseq.sequence,
    parallel: parseq.parallel,
    parallel_object: parseq.parallel_object,
    fallback: parseq.fallback,
    race: parseq.race,
    make_reason: parseq.make_reason,
    wrap_reason,
    constant,
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
    factory_maker,
    parallel_merge,
    try_catcher,
    tap,
    reduce
});
