/*jslint
    unordered
*/
/*global
    setTimeout, clearTimeout
*/
/*property
    apply_fallback, apply_parallel, apply_parallel_object, apply_race, assign,
    catch, check_callback, constant, create, default, delay, do_nothing,
    dynamic_default_import, dynamic_import, evidence, factory_maker, fallback,
    forEach, freeze, if_else, isArray, keys, make_reason,
    make_requestor_factory, map, parallel, parallel_merge, parallel_object,
    promise_requestorize, race, reason, requestorize, sequence, stringify, then,
    try_catcher,value, when, wrap_reason
*/

import parseq from "./parseq.js";

function try_catcher(requestor, name = "try-catcher") {
    return function (callback, value) {
        try {
            return requestor(callback, value);
        } catch (e) {
            const jsonValue = JSON.stringify(
                value,
                (ignore, v) => (
                    v === undefined
                    ? "undefined"
                    : v
                )
            );
            return callback(
                undefined,
                parseq.make_reason(
                    name,
                    `catched requestor error ${jsonValue}`,
                    e
                )
            );
        }
    };
}

function delay(ms, name = "delay") {
    return function (unary) {
        return function delay_requestor(callback, v) {
            parseq.check_callback(callback, name);
            const id = setTimeout(function (v) {
                let result;
                try {
                    result = unary(v);
                } catch (error) {
                    return callback(
                        undefined,
                        parseq.make_reason(name, "", error)
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

const requestorize = (f, name = "requestorize") => delay(0, name)(f);
const do_nothing = requestorize((v) => v, "do_nothing");
const constant = (c) => requestorize(() => c, `constant ${c}`);

function if_else(condition, requestor_if, requestor_else, name = "if_else") {
    return function (callback, value) {
        parseq.check_callback(callback, name);
        if (condition(value)) {
            return requestor_if(callback, value);
        }
        return requestor_else(callback, value);
    };
}

function when(condition, requestor) {
    return if_else(condition, requestor, do_nothing, "when");
}

function wrap_reason(requestor) {
    return function (callback, value) {
        parseq.check_callback(callback, "wrap_reason");
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
        parseq.check_callback(callback, "apply_race");
        try_catcher(parseq.race(
            value.map(requestor_factory),
            time_limit,
            throttle
        ), "apply_race")(callback);
    };
}

function apply_fallback(
    requestor_factory,
    time_limit
) {
    return function (callback, value) {
        parseq.check_callback(callback, "apply_fallback");
        try_catcher(parseq.fallback(
            value.map(requestor_factory),
            time_limit
        ), "apply_fallback")(callback);
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
        parseq.check_callback(callback, "apply_parallel");
        try_catcher(parseq.parallel(
            value.map(requestor_factory),
            (
                typeof optional_requestor_factory === "function"
                ? value.map(optional_requestor_factory)
                : []
            ),
            time_limit,
            time_option,
            throttle
        ), "apply_parallel")(callback);
    };
}

function apply_parallel_object(
    requestor_factory,
    time_limit,
    time_option,
    throttle
) {
    return try_catcher(function (callback, value) {
        parseq.check_callback(callback, "apply_parallel_object");
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
    }, "apply_parallel_object");
}

function parallel_merge(obj, opt_obj, time_limit, time_option, throttle) {
    return function parallel_merge_requestor(callback, value) {
        parseq.check_callback(callback, "parallel_merge");
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

function promise_requestorize(promise, action = "executing promise") {
    return function (callback) {
        parseq.check_callback(callback, action);
        let is_called = false;
        function promise_callback(value, reason) {
            if (!is_called) {
                is_called = true;
                if (value === undefined) {
                    return callback(
                        undefined,
//first callback call: promise has thrown
                        parseq.make_reason(
                            "promise_requestorize",
                            `Failed when ${action}`,
                            reason
                        )
                    );
                }
                return callback(value);
            }
//second callback call: callback has thrown
            const err = new Error(`Callback failed when ${action}`);
            err.evidence = reason;
            throw err;
        }
        promise.then(promise_callback).catch(function (e) {
//at this point we still don't know if the promise or the callback has thrown
            promise_callback(
                undefined,
                e
            );
        });
    };
}

function dynamic_import(url) {
    return promise_requestorize(import(url), `importing ${url}`);
}

function dynamic_default_import(url) {
    return parseq.sequence([
        dynamic_import(url),
        requestorize((m) => m.default)
    ]);
}

function factory_maker(requestor, factory_name = "factory") {
//the adapter combines the online value passed to the requestor with the
// closure/context in which the factory is executed
// its return value is passed to the requestor
    return function factory(adapter) {

//a default adapter is provided in order to manage the most common cases
        function default_adapter(precomputed) {
            return function (value) {
//default: both values are object, so we give the requestor their merge
                if (
                    typeof precomputed === "object"
                    && !Array.isArray(precomputed)
                ) {
                    return Object.assign(
                        {},
                        precomputed,
                        value
                    );
                }
//otherwise, default behavior is to provide only the precomputed value
//in order to have a simple make_requestor_factory unless it's nullish
                return precomputed ?? value;
            };
        }

        if (typeof adapter !== "function") {
            adapter = default_adapter(adapter);
        }
        return function req(cb, value) {
            parseq.check_callback(cb, factory_name);
            return parseq.sequence([
                requestorize(adapter),
                requestor
            ])(cb, value);
        };
    };
}

function make_requestor_factory(unary) {
    return factory_maker(requestorize(unary));
}

export default Object.freeze({
/*jslint-disable*/
    ...parseq,
/*jslint-enable*/
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
    make_reason: parseq.make_reason,
    try_catcher
});
