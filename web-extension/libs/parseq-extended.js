/*jslint
    unordered
    */
/*global
    setTimeout, clearTimeout
    */
/*property
    apply_fallback, apply_parallel, apply_parallel_object, apply_race, assign,
    catch, constant, create, default, delay, do_nothing, dynamic_default_import,
    dynamic_import, evidence, factory, fallback, forEach, freeze, if_else,
    isArray, keys, make_requestor_factory, map, parallel, parallel_merge,
    parallel_object, promise_requestorize, race, reason, requestorize, sequence,
    then, value, when, wrap_reason
*/

import parseq from "./parseq.js";

function check_callback(callback, factory_name) {
    if (typeof callback !== "function" || callback.length !== 2) {
        throw make_reason(
            factory_name,
            "Not a callback function.",
            callback
        );
    }
}

function callback_factory(cb, factory_name) {
    check_callback(cb, factory_name);
    let is_called = false;
    return function callback(value, reason) {
        if (!is_called) {
            is_called = true;
            return cb(value, reason);
        }
        const err = new Error(`Callback failed`);
        if (reason) {
            err.evidence = reason;
        }
        throw err;
    };
}

function make_reason(factory_name, excuse, evidence) {
    const reason = new Error("parseq." + factory_name + (
        excuse === undefined
        ? ""
        : ": " + excuse
    ));
    reason.evidence = evidence;
    return reason;
}

function delay(ms, name = "delay") {
    return function (unary) {
        return function delay_requestor(cb, v) {
            const callback = callback_factory(cb, name);
            const id = setTimeout(function (v) {
                let result;
                try {
                    result = unary(v);
                } catch (error) {
                    return callback(
                        undefined,
                        make_reason("delay", "", error)
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
const do_nothing = delay(0, "do_nothing")((v) => v);
const constant = (c) => delay(0, `constant ${c}`)(() => c);

function if_else(condition, requestor_if, requestor_else, name = "if_else") {
    return function (cb, value) {
        const callback = callback_factory(cb, name);
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
    return function (cb, value) {
        const callback = callback_factory(cb, "wrap_reason");
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
    return function (cb, value) {
        const callback = callback_factory(cb, "apply_race");
        try {
            return parseq.race(
                value.map(requestor_factory),
                time_limit,
                throttle
            )(callback);
        } catch (e) {
            return callback(
                undefined,
                make_reason("apply_race", "", e)
            );
        }
    };
}

function apply_fallback(
    requestor_factory,
    time_limit
) {
    return function (cb, value) {
        const callback = callback_factory(cb, "apply_fallback");
        try {
            return parseq.fallback(
                value.map(requestor_factory),
                time_limit
            )(callback);
        } catch (e) {
            return callback(
                undefined,
                make_reason("apply_fallback", "", e)
            );
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
    return function (cb, value) {
        const callback = callback_factory(cb, "apply_parallel");
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
            return callback(
                undefined,
                make_reason("apply_parallel", "", e)
            );
        }
    };
}

function apply_parallel_object(
    requestor_factory,
    time_limit,
    time_option,
    throttle
) {
    return function (cb, value) {
        const callback = callback_factory(cb, "apply_parallel_object");
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
            return callback(
                undefined,
                make_reason("apply_parallel_object", "", e)
            );
        }
    };
}

function parallel_merge(obj, opt_obj, time_limit, time_option, throttle) {
    return function parallel_merge_requestor(cb, value) {
        const callback = callback_factory(cb, "parallel_merge");
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
        check_callback(callback, action);
        let is_called = false;
        function promise_callback(value, reason) {
            if (!is_called) {
                is_called = true;
                if (value === undefined) {
                    return callback(
                        undefined,
//first callback call: promise has thrown
                        make_reason(
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

function factory(requestor, factory_name = "factory") {
    return function (adapter) {
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
                return precomputed  ?? value;
            };
        }
        if (typeof adapter !== "function") {
            adapter = default_adapter(adapter);
        }
        return function requestor_factory(cb, value) {
            check_callback(cb, factory_name);
            return parseq.sequence([
                requestorize(adapter),
                requestor
            ])(cb, value);
        };
    };
}

function make_requestor_factory(unary) {
    return factory(requestorize(unary));
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
    factory,
    parallel_merge,
    make_reason
});
