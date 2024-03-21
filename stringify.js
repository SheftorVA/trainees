const obj = {
  key1: 'val1',
  key2: 2,
  key3: { name: 'Valdos', age: 23 },
  fn() {},
  key4: Symbol('id'),
  key5: NaN,
  Key6: null,
  Key7: undefined,
  Key8: +Infinity,
  Key9: -Infinity,
  Key10: 'Строка "строка внутри двойных кавычек"',
  Key11: 'key',
  Key12: '\n',
  Key13: '\t',
  Key14: '\r',
  Key15: '\t',
  Key16: '\b',
  Key17: '\\',
};

const number = 7;

function stringify(value) {
  if (typeof value === 'string') {
    const result = value.replace(/["\n\t\r\f\b\\]/g, (match) => {
      if (match === '\n') return '\\n';
      if (match === '\t') return '\\t';
      if (match === '\r') return '\\r';
      if (match === '\b') return '\\b';
      if (match === '\\') return '\\\\';
      return '\\' + match;
    });

    return `"${result}"`;
  }

  if ((typeof value === 'number' && !isNaN(value)) || typeof value === 'boolean') {
    return `${value}`;
  }

  if (value === null) {
    return 'null';
  }

  if (value === undefined || typeof value === 'symbol' || typeof value === 'function') {
    return undefined;
  }

  let result = ``;

  if (Array.isArray(value)) {
    result = value.map((item) => {
      if (typeof item === 'function' || typeof item === 'symbol' || item === undefined || item === null) {
        return 'null';
      } else if (typeof item === 'object') {
        return `${stringify(item)}`;
      }
      return stringify(item);
    });
    return `[${result}]`;
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    result = `{`;
    for (const [key, element] of Object.entries(value)) {
      if (typeof element === 'symbol' || typeof element === 'function' || (element === undefined && element !== null)) {
        continue;
      }

      result += `${stringify(key)}:${stringify(element)},`;
    }
    result = result.join(',');
    result += `}`;
    return result;
  } else if (isNaN(value) || !isFinite(value)) {
    return 'null';
  }
}

stringify(obj);
