// 校验器

// 非空
function checkNotEmpty(value) {
    if (value && value.replace(/\s/g, '').length > 0) {
        return true
    }
    return false
}

// 校验最大长度
function checkMaxLength(len, value) {
    if (value && value.length > len) {
        return false
    }
    return true
}

// 最大长64
function checkMaxLength64(value) {
    return checkMaxLength(64, value);
}
// 最大长10
function checkMaxLength10(value) {
    return checkMaxLength(10, value);
}

// 常规校验返回信息集
const errorMsgs = {
    NO_MAX_THAN: "长度不能超过",
    NO_LESS_THAN: "长度不能少于",
    NOT_EMPTY: "不能为空",
    INVALID_CHARS: "包含无效字符"
}

// 校验失败的返回及回调
let errResAndCallback = function (res, msg, callback, $elTarget) {
    res['msg'] = msg || 'error';
    callback && callback(res, $elTarget); // 校验失败回调函数
    return res; // 校验失败停止
};
// 元素校验,校验某个元素的的某个规则集(某个事件的规则集或者元素的所有规则)
// 并调用该元素失败后的返回值
// callback 某个规则集校验完成即回调(不管成功或失败)
let validateFun = function (valueIn, key, $elTarget, rules, callback) {
    console.log(key, valueIn, rules, '开始校验。。。。');
    let res = { ok: false, name: key }; // 每个元素的校验状态需要单独的记录
    for (let i = 0; i < rules.length; i++) {
        switch (rules[i]['type']) { // 校验类型
            // 某元素的单次校验,如其中一条规则失败,则停止校验并返回失败
            case "required":
                console.log('required');
                if (checkNotEmpty(valueIn)) {
                    callback && callback(res, $elTarget);
                    break; // 校验成功
                }
                return errResAndCallback(res, rules[i]['msg'], callback, $elTarget); // 校验失败停止
            case "regex":
                console.log('regex');
                // 直接使用 /^[a-z]+$/g 的变量 会出现奇奇怪怪的问题
                if (new RegExp(rules[i]['regex']).test(valueIn)) {
                    callback && callback(res, $elTarget);
                    break;  // 校验成功
                }
                return errResAndCallback(res, rules[i]['msg'], callback, $elTarget); // 校验失败停止
            case "func":
                console.log('func');
                if (rules[i]['validator'](valueIn)) {
                    callback && callback(res, $elTarget);
                    break;
                }
                return errResAndCallback(res, rules[i]['msg'], callback, $elTarget); // 校验失败停止
        }
    }
    // 校验成功的返回
    res['ok'] = true; // 通过所有校验,设置为真
    console.log('校验结束。。。', res)
    return res;
};

export default {
    // loginFormValidators: { // 不支持校验器的动态修改,规则默认绑定到
    //     username: {
    //         rules: [{
    //                 type: 'required',
    //                 msg: '用户名不能为空'
    //             }, // default event to blur
    //             {
    //                 type: 'regex',
    //                 msg: '账户名包含无效字符',
    //                 regex: /^[a-zA-Z0-9]+$/g, // 正确的正则
    //                 event: 'input' // string || arr
    //             },
    //             {
    //                 type: 'func',
    //                 msg: '账户名不能超过10位',
    //                 validator: validate.checkMaxLength10,
    //                 event: 'input'
    //             },
    //         ],
    //         每一个字段至多可以存在一个回调, callback在每个元素校验完成是回调(不管成功或失败)
    //         一般用于处理每个元素在某个规则集下校验完毕后,界面上需要额外处理的逻辑 
    //         callback: this.validateCallback 
    //     },
    //     pass: {},
    //     captcha: {}
    // }
    // 规则默认绑定到blur事件,如果存在其他事件,需要在规则中说明
    // 默认$form一定存在且为form的html element
    bindFormValidators($form, validatorsJson) {
        if (Object.keys(validatorsJson).length) {
            for (let key in validatorsJson) {
                console.log(validatorsJson[key], '校验器绑定中')
                let { rules, callback } = validatorsJson[key];
                let defualtEventType = 'blur'; // 默认绑定的事件类型
                if (rules && rules.length) {
                    let eventSet = new Set();   // 存储当前元素的所有事件类型
                    let eventJson = {}; // 存放每种事件对应的规则
                    // 设置 eventSet  eventJson
                    let setFun = function (eventType, rule) {
                        eventSet.add(eventType); // 收集所有的事件类型
                        (eventJson[eventType] || (eventJson[eventType] = [])).push(rule); // 将校验规则放入每种对应的事件类型中
                    };
                    rules.forEach(rule => {
                        let eventTypeTmp = rule.event || defualtEventType; // string || arr
                        (typeof eventTypeTmp === 'string') ? setFun(eventTypeTmp, rule) : eventTypeTmp.forEach(eventType => { // arr
                            setFun(eventType, rule);
                        });
                    });

                    // 给元素绑定所有的事件
                    let $elItem = $form.$q("[name='" + key + "']"); // 当前dom元素
                    eventSet.forEach(eventType => {
                        $elItem.addEventListener(eventType, function (event) {
                            event = event || window.event || arguments[0];
                            let $target = event.target || event.srcElement;
                            // 校验元素
                            validateFun($target.value, key, $target, eventJson[eventType], callback);
                            event.stopPropagation && event.stopPropagation();
                            return false;
                        }, true)
                    });

                }
            }

            // 给form绑定validate 和 validateAll
            // validate 校验到元素错误即停止 , 返回格式 {ok: false, msg: '账户名不能为空'}
            // validateAll 校验每一个元素,收集每一个元素的第一个错误
            // 格式: {ok: false, msg: '校验失败', name: 'username', ele: $target, username:{ok: false, msg: '账户名不能为空'}, pass:{ok: false, msg: '密码不能为空'}}
            // validatorsJson 每个元素的规则集, 校验完成回调, all是否校验所有元素默认false
            let validateForm = function(validatorsJson,callFun, all){
                let res = { ok: true }; // 与上面相反,默认为真
                for (let key in validatorsJson) {
                    console.log(validatorsJson[key], '校验form')
                    let { rules, callback } = validatorsJson[key];
                    if (rules && rules.length) {
                        let $elItem = $form.$q("[name='" + key + "']"); // 当前dom元素
                        let res1 = validateFun($elItem.value, key, $elItem, rules, callback);
                        if(all){ // 校验所有元素
                            console.log('all');
                            if (res1.ok === false) { // 校验失败,加入返回错误集
                                res[key] = res1;
                                res['ok'] && ( // 第一个校验失败的元素
                                    res['ok'] = false,
                                    res['msg'] = res1['msg'],
                                    res['name'] = key,
                                    res['ele'] = $elItem
                                );
                            }
                        }else{ // 默认校验到第一个有错误的元素即停止, 找到第一个校验失败的元素,停止校验并返回错误
                            console.log('single');
                            if (res1.ok === false) {
                                res = res1;
                                res['ele'] = $elItem
                                break;
                            }
                        }
                    }
                }
                // 返回校验结果
                callFun && callFun(res);
                return res;
            };
            
            $form.validate = (callFun) => {
                return validateForm(validatorsJson, callFun);
            };
            $form.validateAll = (callFun) => {
                return validateForm(validatorsJson, callFun, true);
            };
            return;
        }

        // 给form绑定validate, 如果没有有效的校验规则,则恒返回成功
        $form.validate = $form.validateAll = (callFun) => {
            console.log('空校验返回');
            let res = { ok: true };
            callFun && callFun(res);
            return res;
        };
    },

    // 校验规则
    checkNotEmpty,
    checkMaxLength64,
    checkMaxLength10,
    // msgs
    errorMsgs
}