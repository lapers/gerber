class Gerber {
  constructor() {
    this.objects = [];
  }

  parseGerberString(input_data) {
    var objects = [];

    var runtime_parameters = {
      coordinate_fromat:  undefined,
      units:              undefined,
      current_point:      undefined,
      current_aperture:   undefined,
      interpolation_mode: undefined,
      quadrant_mode:      undefined,
      polarity:           'D',
      mirroring:          'N',
      rotation:           0.0,
      scaling:            1.0,
    };

    var aperture_dictionary = new Map();

    const lines = input_data.split('\n');

    try {
      for (var l = 0; l < lines.length; l++) {
        const line = lines[l];

        if (/^%(.*)?\*%$/.test(line)) {
          //throw ("Gerber syntax error at line " + (l+1) + " -> " + line);
          const command = line.replace(/^%/,'').replace(/\*%$/,'');
          const attribute = new GerberCommand(command.substr(0, 2), command.substr(2, command.length));

          if (attribute.command ==  'FS') {
            const payload = (attribute.payload.startsWith('LA') ? attribute.payload.substr(2, attribute.payload.length) : attribute.payload);
            const x_integer = parseInt(payload[1]);
            const x_fractional = parseInt(payload[2]);
            const y_integer = parseInt(payload[4]);
            const y_fractional = parseInt(payload[5]);
            if (isNaN(x_integer) || isNaN(x_fractional) || isNaN(y_integer) || isNaN(y_fractional)) throw ("Gerber \"FS\" command format error at line " + (l+1) + " -> " + line);
            runtime_parameters.coordinate_fromat = [ [ x_integer, x_fractional ], [ y_integer, y_fractional ] ];
          } else if (attribute.command == 'MO') {
            if (/IN|MM/.test(attribute.payload)) runtime_parameters.units = attribute.payload;
            else throw ("Gerber \"MO\" command format error at line " + (l+1) + " -> " + line);
          } else if (attribute.command == 'LP') {
            if (/D|C/.test(attribute.payload)) runtime_parameters.polarity = attribute.payload;
            else throw ("Gerber \"LP\" command format error (unknown argument) at line " + (l+1) + " -> " + line);
          } else if (attribute.command == 'LM') {
            if (/N|X|Y|XY/.test(attribute.payload)) runtime_parameters.mirroring = attribute.payload;
            else throw ("Gerber \"LM\" command format error (unknown argument) at line " + (l+1) + " -> " + line);
          } else if (attribute.command == 'LR') {
            const angle = parseFloat(attribute.payload);
            if (!isNaN(angle))
              runtime_parameters.rotation = angle;
            else throw ("Gerber \"LR\" command format error (wrong number format) at line " + (l+1) + " -> " + line);
          } else if (attribute.command == 'LS') {
            const scale = parseFloat(attribute.payload);
            if (!isNaN(scale) && scale > 0)
              runtime_parameters.scaling = scale;
            else throw ("Gerber \"LS\" command format error (wrong number format) at line " + (l+1) + " -> " + line);
          } else if (attribute.command == 'AD') {
            const parts = attribute.payload.substr(1, attribute.payload.length).split(',');
            if (parts.length == 1) {
              // PRELOAD FROM TEMPLATES
            } else {
              const code = parseInt(parts[0].substring(0, parts[0].length-1));
              const template = parts[0].substring(parts[0].length-1);
              const modifiers = parts[1].split('X').map(x => parseFloat(x));
              
              //throw ("Gerber \"AD\" command format error (wrong argument format) at line " + (l+1) + " -> " + line);
              aperture_dictionary.set(code, new Aperture(template, modifiers));
              /*if (loglevel >= 2)*/ console.log(aperture_dictionary.get(code));
            }
          } else console.log(attribute);
        } else {
          const clear_line = line.replace(/\*$/,'');
          const args = clear_line.split(/([A-Z])/g).filter(function (el) {
            return el;
          });

          if (args[0] == 'G') {
            const code = parseInt(args[1]);
            if (code == 4) {
              continue;
            } else if (code >= 1 && code <= 3) {
              runtime_parameters.interpolation_mode = clear_line;
            }
            else if (code == 74 || code == 75) {
              runtime_parameters.quadrant_mode = clear_line;
            } else if (code == 36 || code == 37) {
              runtime_parameters.quadrant_mode = clear_line;
            } else console.log(clear_line);
          } else if (args[0] == 'D') {
            const code = parseInt(args[1]);
            if (code < 10) {
              throw ("Gerber \"D\" command format error (used wrong value '" + current_command.D + "') at line " + (l+1) + " -> " + clear_line);
            } else {
              const code = parseInt(args[1]);
              const aperture = aperture_dictionary.get(code);
              if (aperture === undefined) throw ("Gerber wrong structure error (aperture not found at dictionary) at line " + (l+1) + " -> " + clear_line);
              runtime_parameters.current_aperture = aperture;
              console.log(runtime_parameters.current_aperture);
            }
          } else if (args[0] == 'M') {
            const code = parseInt(args[1]);
            if (code == 2) {
              break;
            }
          } else {
            var current_command = {
              X: (typeof current_point === 'undefined' ? undefined : runtime_parameters.current_point.X),
              Y: (typeof current_point === 'undefined' ? undefined : runtime_parameters.current_point.Y),
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
                  throw ("Gerber syntax error at line " + (l+1) + " -> " + clear_line);
              }
            }

            switch (current_command.D) {
              case 1:
                objects.push(new GObject(runtime_parameters.current_aperture, runtime_parameters.polarity));
                break;
              case 2:

                break;
              case 3:
                
                break;
              default:
                throw ("Gerber \"D\" command format error (used reserved value '" + current_command.D + "') at line " + (l+1) + " -> " + clear_line);
            }

            runtime_parameters.current_point = { X: current_command.X, Y: current_command.Y };
          }
        }

        //console.log(runtime_parameters);
        //if (typeof runtime_parameters.current_point !== 'undefined') console.log(runtime_parameters.current_point.X + " x " + runtime_parameters.current_point.Y);
      }
    } catch (e) {
      console.error(e);
    }

    return objects;
  }
}

class GerberCommand {
  constructor(command, payload) { // ex: FSLAX46Y46 -> (command=FS, payload=LAX46Y46)
    this.command = command;
    this.payload = payload;
  }
}
