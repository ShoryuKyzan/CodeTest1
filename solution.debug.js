var https = require('https');
var readline = require('readline');
var assert = require('chai').assert;

const selectablePropNames = 
    {
        'class': 'string',
        'classNames': 'array',
        'identifier': 'string'
    };

// download file
function downloadFile(callback){
    console.log('downloading file...');
    https.get('https://raw.githubusercontent.com/jdolan/quetoo/master/src/cgame/default/ui/settings/SystemViewController.json', (res) => {
        console.log('parsing file...');
        let output = '';
        res.on('data', (chunk)=> {
            output += chunk;
        });
        res.on('end', ()=> {
            let parsedObject = JSON.parse(output);
            callback(parsedObject);
        });
    });
    
}

function selectMode(){
    downloadFile((parsedObject) => {
        var rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false
        });

        rl.on('line', function(line){
            let results = select(line, parsedObject);
            // output
            results.forEach((result) => {
                console.log(JSON.stringify(result));
            });
            console.log(results.length);
        });
    });
}

function select(line, parsedObject){
    // parse
    let selectors = parseLine(line);
    // scan for selector
    let results = [];
    let selectorIndex = 0;
    scan(parsedObject, selectors, selectorIndex, results);
    return results;
}

function parseLine(line){
    // parse line into selectors
    // split selector by space
    let selectorsInput = line.split(' ');
    let selectors = [];
    selectorsInput.forEach((selector) => {
        let classSelector = null;
        let classNameSelector = null;
        let identifierSelector = null;
        
        let parts = selector.split('.');
        // finding class and id in 1st half
        let parts2 = parts[0].split('#');
        if(parts2.length === 1){
            parts2.push('');
        }
        classSelector = parts2[0] && parts2[0] !== '' ? parts2[0] : null;
        identifierSelector = parts2[1] && parts2[1] !== '' ? parts2[1] : null;
        
        // finding classname and id in 2nd half
        if(parts.length > 1){
            parts2 = parts[1].split('#');
            if(parts2.length === 1){
                parts2.push('');
            }
            classNameSelector = parts2[0] && parts2[0] !== '' ? parts2[0] : null;
            if(!identifierSelector || identifierSelector === ''){
                identifierSelector = parts2[1] && parts2[1] !== '' ? parts2[1] : null;
            }
        }

        const selectorObj = {
            class: classSelector,
            className: classNameSelector,
            identifier: identifierSelector
        };
        // count non-nulls and add as prop
        let valid = 0;
        for(let sel in selectorObj){
            if(selectorObj[sel]){
                valid += 1;
            }
        }
        selectorObj.validCount = valid;
        
        selectors.push(selectorObj);
    });
    return selectors;
}

let indent = 0; // XXX
function scan(object, conditions, conditionIndex, results){
    //* XXX
    let spacing = '';
    for(let i = 0; i < indent; i++){
        spacing += '    ';
    }
    // XXX */
    let condition = conditions[conditionIndex];
    //trace(''); // XXX
    //trace(condition); // XXX
    //trace(object); // XXX
    if(typeof(object) === 'array'){
        indent += 1; // XXX
        object.forEach((o) =>{
            scan(o, conditions, conditionIndex, results)
        });
        indent -= 1; // XXX
    }else if(typeof(object) === 'object'){
        let matchedCounter = 0;
        // find out if object matches current condition
        for(let property in object){
            let value = object[property];
            let conditionLookup = property;
            if(property === 'classNames'){
                conditionLookup = 'className';
            }

            // if property is selectable
            // and the condition has a value for this condition
            if(selectablePropNames[property]){
                trace(spacing, 'cond', property, selectablePropNames[property], value, condition[conditionLookup]); // XXX
            }
            
            if(selectablePropNames[property]
                && condition[conditionLookup]){
                // value must match condition value
                trace(spacing, 'value', value, typeof(value));
                if(typeof(value) === 'string'
                    && value === condition[conditionLookup]){
                    matchedCounter += 1;
                // value must contain condition value
                }else if(typeof(value) === 'array'
                    && value.indexOf(condition[conditionLookup]) !== -1){
                    matchedCounter += 1;
                }else if(value && typeof(value) === 'object'
                    && Object.values(value).find((it) => { return it === condition[conditionLookup]; }) !== undefined){
                    matchedCounter += 1;
                }
                trace(spacing, 'matchedCounter', matchedCounter);
            }
        }
        if(matchedCounter === condition.validCount){
            if(conditionIndex === conditions.length - 1){
                // add object to results
                results.push(object);
            }else{
                conditionIndex += 1;
            }
            // search descendents for remaining conditions, or result-adding condition.
        }
        // continue searching for conditions (either with modified set or same set)
        for(let property in object){
            let value = object[property];
            let valType = typeof(value);
            if(!selectablePropNames[property]){
                if(valType === 'array'){
                    indent += 1; // XXX
                    value.forEach((o) =>{
                        scan(o, conditions, conditionIndex, results)
                    });
                    indent -= 1; // XXX
                }else if(valType === 'object'){
                    indent += 1; // XXX
                    scan(value, conditions, conditionIndex, results)
                    indent -= 1; // XXX
                }
            }
        }
    }
}

// TESTS
let tracing = false;
function trace(){
    if(tracing){
        console.log.apply(this, arguments);
    }
}

downloadFile((parsedObject) => {
    let line = '';
    let res = [];
    // parseLine tests
    line = '.fooz';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: null,
            className: 'fooz',
            identifier: null,
            validCount: 1
        }
    ]);
    
    line = 'foo.fooz';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: 'foo',
            className: 'fooz',
            identifier: null,
            validCount: 2
        }
    ]);

    line = 'foo#bar';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: 'foo',
            className: null,
            identifier: 'bar',
            validCount: 2
        }
    ]);

    line = 'foo.fooz#bar';
    res = parseLine(line);
    //trace('res', res); // XXX
    assert.deepEqual(res, [
        {
            class: 'foo',
            className: 'fooz',
            identifier: 'bar',
            validCount: 3
        }
    ]);

    line = 'elem#id.class';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: 'elem',
            className: 'class',
            identifier: 'id',
            validCount: 3
        }
    ]);

    line = '#bar';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: null,
            className: null,
            identifier: 'bar',
            validCount: 1
        }
    ]);

    line = '.foo bar';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: null,
            className: 'foo',
            identifier: null,
            validCount: 1
        },
        {
            class: 'bar',
            className: null,
            identifier: null,
            validCount: 1
        }
    ]);

    line = 'barx .foo#bar bax';
    res = parseLine(line);
    assert.deepEqual(res, [
        {
            class: 'barx',
            className: null,
            identifier: null,
            validCount: 1
        },
        {
            class: null,
            className: 'foo',
            identifier: 'bar',
            validCount: 2
        },
        {
            class: 'bax',
            className: null,
            identifier: null,
            validCount: 1
        }
    ]);

    // scan tests
    line = 'Input';
    res = [];
    res = select(line, parsedObject);
    res = select(line, parsedObject);
    //trace('res count', res.length);
    assert.strictEqual(res.length, 26);
    
    line = '.container';
    res = [];
    res = select(line, parsedObject);
    assert.strictEqual(res.length, 6);

    line = 'foo bar';
    res = [];
    let testObject = [
        {
            class: 'foo',
            classNames: [null],
            identifier: null,
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                    ]
                }
            ]
        },
        {
            class: 'foo',
            classNames: [null],
            identifier: null,
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                    ]
                }
            ]
        },
    ];
    res = select(line, testObject);
    assert.strictEqual(res.length, 2);

    line = 'foo bar bax';
    res = [];
    testObject = [
        {
            class: 'foo',
            classNames: [null],
            identifier: null,
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                        {
                            class: 'bax',
                            classNames: [null],
                            identifier: null,
                            children: [
                            ]
                        }

                    ]
                }
            ]
        },
        {
            class: 'foo',
            classNames: [null],
            identifier: null,
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                        {
                            class: 'bax',
                            classNames: [null],
                            identifier: null,
                            children: [
                            ]
                        }

                    ]
                }
            ]
        },
    ];
    res = select(line, testObject);
    assert.strictEqual(res.length, 2);
    
    line = 'foo#buddy bar bax';
    res = [];
    testObject = [
        {
            class: 'foo',
            classNames: [null],
            identifier: 'buddy',
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                        {
                            class: 'bax',
                            classNames: [null],
                            identifier: null,
                            children: [
                            ]
                        }

                    ]
                }
            ]
        },
        {
            class: 'foo',
            classNames: [null],
            identifier: null,
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                        {
                            class: 'bax',
                            classNames: [null],
                            identifier: null,
                            children: [
                            ]
                        }

                    ]
                }
            ]
        },
    ];
    res = select(line, testObject);
    assert.strictEqual(res.length, 1);
    
    line = 'foo#buddy bar.bax#bad bax';
    res = [];
    testObject = [
        {
            class: 'foo',
            classNames: [null],
            identifier: 'buddy',
            children: [
                {
                    class: 'bar',
                    classNames: ['bax'],
                    identifier: 'bad',
                    children: [
                        {
                            class: 'bax',
                            classNames: [null],
                            identifier: 'result',
                            children: [
                            ]
                        }

                    ]
                }
            ]
        },
        {
            class: 'foo',
            classNames: [null],
            identifier: null,
            children: [
                {
                    class: 'bar',
                    classNames: [null],
                    identifier: null,
                    children: [
                        {
                            class: 'bax',
                            classNames: [null],
                            identifier: null,
                            children: [
                            ]
                        }

                    ]
                }
            ]
        },
    ];
    res = select(line, testObject);
    assert.strictEqual(res.length, 1);
    
    line = 'foo#buddy bar#bad.bax bax';
    res = select(line, testObject);
    assert.strictEqual(res.length, 1);
    
});

//////////////////////
selectMode();