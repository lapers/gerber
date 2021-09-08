const {GObject, GLine, GArc, GFlash} = require('./gobject.js');

function parseGerberString(input_data) {
    var objects = [];

    var runtime_parameters = {
        coordinate_fromat:  undefined,
        units:              undefined,
        current_point:      { X: 0, Y: 0 },
        current_aperture:   undefined,
        interpolation_mode: undefined,
        quadrant_mode:      undefined,
        polarity:           'D',
        mirroring:          'N',
        rotation:           0.0,
        scaling:            1.0,
    };

    var aperture_dictionary = new Map();
    var attributes_dictionary = new Map();

    const lines = input_data.split('\n');

    for (var l = 0; l < lines.length; l++) {
        const line = lines[l];
        if (isBlank(line)) continue;
        
        if (/^%(.*)?\*%$/.test(line)) {
            //throw ("Gerber syntax error at line " + (l+1) + " -> " + line);
            const command = line.replace(/^%/,'').replace(/\*%$/,'');
            const attribute = new GerberCommand(command.substr(0, 2), command.substr(2, command.length));

            if (attribute.command == 'TF') {
                // IGNORING File Attributes
            } else if (attribute.command == 'TA' || attribute.command == 'TO') {
                // <TA command> = %TA<AttributeName>[,<AttributeValue>]*%
                // <TO command> = %TO<AttributeName>[,<AttributeValue>]*%
                // <AttributeValue> = <Field>{,<Field>}
                // The .N attribute is intended to allow quick visualization of nets and, more importantly, to define the CAD netlist
                // The .C object attribute attaches the reference descriptor of a component to an object
                // The .P object attribute attaches the reference descriptor and pin name of a component pin to an object
                
                const parts = attribute.payload.split(/,(.+)/);
                const attribute_name = parts[0];
                const value = parts[1] === undefined ? "" : parts[1]; 
                
                attributes_dictionary.set(attribute_name, value);
            } else if (attribute.command == 'TD') {
                const attribute_name = attribute.payload;
                
                if (isBlank(attribute_name))
                    attributes_dictionary.clear();
                else
                    attributes_dictionary.delete(attribute_name);
            } else if (attribute.command ==  'FS') {
                const payload = (attribute.payload.startsWith('LA') ? attribute.payload.substr(2, attribute.payload.length) : attribute.payload);
                const x_integer = parseInt(payload[1]);
                const x_fractional = parseInt(payload[2]);
                const y_integer = parseInt(payload[4]);
                const y_fractional = parseInt(payload[5]);
                if (isNaN(x_integer) || isNaN(x_fractional) || isNaN(y_integer) || isNaN(y_fractional)) throw new GerberParseException(`"FS" command format error at line ${l+1} -> ${line}`);
                runtime_parameters.coordinate_fromat = [ [ x_integer, x_fractional ], [ y_integer, y_fractional ] ];
            } else if (attribute.command == 'MO') {
                if (/IN|MM/.test(attribute.payload)) runtime_parameters.units = attribute.payload;
                else throw new GerberParseException(`"MO" command format error at line ${l+1} -> ${line}`);
            } else if (attribute.command == 'LP') {
                // The LP command starts a new level and sets its polarity to either dark or clear
                if (/D|C/.test(attribute.payload)) runtime_parameters.polarity = attribute.payload;
                else throw new GerberParseException(`"LP" command format error (unknown argument) at line ${l+1} -> ${line}`);
            } else if (attribute.command == 'LM') {
                // 
                if (/N|X|Y|XY/.test(attribute.payload)) runtime_parameters.mirroring = attribute.payload;
                else throw new GerberParseException(`"LM" command format error (unknown argument) at line ${l+1} -> ${line}`);
            } else if (attribute.command == 'LR') {
                // 
                const angle = parseFloat(attribute.payload);
                if (!isNaN(angle))
                    runtime_parameters.rotation = angle;
                else throw new GerberParseException(`"LR" command format error (wrong number format) at line ${l+1} -> ${line}`);
            } else if (attribute.command == 'LS') {
                // 
                const scale = parseFloat(attribute.payload);
                if (!isNaN(scale) && scale > 0)
                    runtime_parameters.scaling = scale;
                else throw new GerberParseException(`"LS" command format error (wrong number format) at line ${l+1} -> ${line}`);
            } else if (attribute.command == 'AD') {
                // The AD command creates an aperture and puts it into apertures dictionary
                const parts = attribute.payload.substr(1, attribute.payload.length).split(',');
                if (parts.length == 1) {
                    // PRELOAD FROM TEMPLATES
                    throw new GerberParseException(`"${attribute.command}" command not fully implemented yet`);
                } else {
                    //throw (`"AD" command format error (wrong argument format) at line ${l+1} -> ${line}`);
                    
                    const code = parseInt(parts[0].substring(0, parts[0].length-1));
                    const template = parts[0].substring(parts[0].length-1);
                    const modifiers = parts[1].split('X').map(x => parseFloat(x));
                    
                    aperture_dictionary.set(code, new Aperture(template, modifiers));
                }
            } else throw new GerberParseException(`Unknown or not implemented command "${attribute.command}" at line ${l+1} -> ${line}`);
        } else {
            const clear_line = line.replace(/\*$/,'');
            const args = clear_line.split(/([A-Z])/g).filter(function (el) {
                return el;
            });

            if (args[0] == 'G') {
                const code = parseInt(args[1]);
                if (code == 4) {
                    // IGNORING COMMENTS
                    continue;
                } else if (code >= 1 && code <= 3) {
                    runtime_parameters.interpolation_mode = clear_line;
                } else if (code == 74 || code == 75) {
                    runtime_parameters.quadrant_mode = clear_line;
                } else if (code == 36 || code == 37) {
                    runtime_parameters.quadrant_mode = clear_line;
                } else console.log(clear_line);
            } else if (args[0] == 'D') {
                const code = parseInt(args[1]);
                if (code < 10) {
                    throw new GerberParseException(`"D" command format error (used wrong value '${current_command.D}') at line ${l+1} -> ${clear_line}`);
                } else {
                    const code = parseInt(args[1]);
                    const aperture = aperture_dictionary.get(code);
                    if (aperture === undefined) throw new GerberParseException(`Wrong structure error (aperture not found at dictionary) at line ${l+1} -> ${clear_line}`);
                    runtime_parameters.current_aperture = aperture;
                }
            } else if (args[0] == 'M') {
                const code = parseInt(args[1]);
                if (code == 2) {
                    break;
                }
            } else {
                var current_command = {
                    X: runtime_parameters.current_point.X,
                    Y: runtime_parameters.current_point.Y,
                    I: 0,
                    J: 0,
                    D: undefined
                };

                for (var i = 0; i < args.length; i+=2) {
                    const key = args[i];
                    const value = args[i+1];

                    switch (key) {
                        case 'X':
                        current_command.X = parseInt(value);
                        break;
                        case 'Y':
                        current_command.Y = parseInt(value);
                        break;
                        case 'I':
                        current_command.I = parseInt(value);
                        break;
                        case 'J':
                        current_command.J = parseInt(value);
                        break;
                        case 'D':
                        current_command.D = parseInt(value);
                        break;
                        default:
                        throw new GerberParseException(`Syntax error at line ${l+1} -> ${clear_line}`);
                    }
                }
                
                const new_point = { X: current_command.X, Y: current_command.Y };
                
                //throw new GerberParseException(`Wrong interpolation mode '${runtime_parameters.interpolation_mode}') while processing line ${l+1} -> ${line}`);
                switch (current_command.D) {
                    // runtime_parameters.interpolation_mode
                    // G01 -> Linear interpolation
                    // G02 -> Clockwise interpolation
                    // G03 -> Counterclockwise interpolation
                    
                    case 1:
                        const object = runtime_parameters.interpolation_mode == "G01" ?
                            new GLine(formatPoint(runtime_parameters.current_point, runtime_parameters.coordinate_fromat), formatPoint(new_point, runtime_parameters.coordinate_fromat)) : 
                            new GArc(formatPoint(runtime_parameters.current_point, runtime_parameters.coordinate_fromat), current_command.I, current_command.J, runtime_parameters.interpolation_mode == "G02" ? 2 : 3);
                        
                        object.setAperture(runtime_parameters.current_aperture);
                        object.setPolarity(runtime_parameters.polarity);
                        
                        objects.push(object);
                        break;
                    case 2:
                        
                        break;
                    case 3:
                        const flash = new GFlash(formatPoint(runtime_parameters.current_point, runtime_parameters.coordinate_fromat));
                        
                        flash.setAperture(runtime_parameters.current_aperture);
                        flash.setPolarity(runtime_parameters.polarity);
                        
                        objects.push(flash);
                        break;
                    default:
                        throw new GerberParseException(`"D" command format error (used reserved value '${current_command.D}') at line ${l+1} -> ${line}`);
                }
                
                // TODO: May it needed to be moved to gobject creation section?
                runtime_parameters.current_point = new_point;
            }
        }
    }

    //return { objects: objects, apertures: aperture_dictionary, bounds: calculateViewBounds(objects) };
    return { objects: objects, objects_count: objects.length, format: runtime_parameters.coordinate_fromat };
}

function GerberParseException(message) { this.message = `[GERBER_PARSE] ${message}`; this.name = "Exception while parsing gerber file"; }
function isBlank(str) { return (!str || /^\s*$/.test(str)); }

function formatPoint(point, format) {
    return {
        X: point.X / Math.pow(10, format[0][1]),
        Y: point.Y / Math.pow(10, format[1][1])
    };
}

function calculateViewBounds(objects) {
    var x_min, x_max;
    var y_nim, y_max;
    
    // #### BODY ####
    
    for (var i = 0; i < gerber.objects_count; i++) {
        const object = gerber.objects[i];
        
        if (object instanceof GLine) {
            
        } else if (object instanceof GArc) {
            
        } else if (object instanceof GFlash) {
            
        }
    }
    
    // #### RETURN CHECKS ####
    
    if (x_min === undefined || x_max === undefined || y_min === undefined || y_max === undefined)
        return { X: 0, Y: 0, W: 0, H: 0 };
    else
        return { X: x_min, Y: y_min, W: (x_max - x_min), H: (y_max - y_min) };
}

class GerberCommand {
    constructor(command, payload) { // ex: FSLAX46Y46 -> (command=FS, payload=LAX46Y46)
        this.command = command;
        this.payload = payload;
    }
}

class Aperture {
  constructor(tepmplate, modifiers) {
    this.t = tepmplate;
    this.m = modifiers;
  }
}

class BlockAperture {
  constructor() {
    this.shapes = [ ];
  }
}



module.exports = {
    parseGerberString: parseGerberString
};
