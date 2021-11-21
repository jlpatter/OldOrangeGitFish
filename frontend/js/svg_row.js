/**
 * A row in the svg table.
 */
module.exports = class SVGRow {
  /**
   * Construct the svg row
   * @param {string} sha
   * @param {Array<string>} parentShas
   * @param {int} indent
   * @param {int} x
   * @param {int} y
   * @param {Array} entry
   */
  constructor(sha, parentShas, indent, x, y, entry) {
    this.sha = sha;
    this.parentShas = parentShas;
    this.indent = indent;
    this.x = x;
    this.y = y;
    this.width = 0;
    this.entry = entry;
  }

  /**
   * Gets the SVGRow parents
   * @param {Array<SVGRow>} array
   * @return {Array<SVGRow>}
   */
  getParentSVGRows(array) {
    const self = this;
    if (self.parentShas.length === 0) {
      return [];
    }
    const parentSVGRows = [];
    for (let i = 0; i < self.parentShas.length; i++) {
      for (let j = 0; j < array.length; j++) {
        if (self.parentShas[i] === array[j].sha) {
          parentSVGRows.push(array[j]);
          break;
        }
      }
    }
    return parentSVGRows;
  }

  /**
   * Draw each of the components of the svg row.
   * @param {jQuery} $commitTableSVG
   * @param {Array<SVGRow>} prevs
   */
  draw($commitTableSVG, prevs) {
    const self = this;
    const color = self.getColor();
    const svgCircle = self.makeSVG('circle', {'cx': self.x, 'cy': self.y, 'r': 10, 'stroke': color, 'stroke-width': 1, 'fill': color});
    $commitTableSVG.append(svgCircle);
    if (prevs.length > 0) {
      for (let i = 0; i < prevs.length; i++) {
        const svgLine = self.makeSVG('line', {x1: prevs[i].x, y1: prevs[i].y, x2: self.x, y2: self.y, style: 'stroke:' + color + ';stroke-width:4'});
        $commitTableSVG.append(svgLine);
      }
    }
    let currentX = self.x + 15;
    self.entry[0].forEach(function(branch) {
      const branchText = '(' + branch + ') ';
      const svgTextElem = self.makeSVG('text', {x: currentX, y: self.y + 6, fill: color});
      svgTextElem.textContent = branchText;
      $commitTableSVG.append(svgTextElem);
      currentX += svgTextElem.getBBox().width + 5;
    });

    const entryElem = self.makeSVG('text', {x: currentX, y: self.y + 6, fill: 'white'});
    entryElem.textContent = self.entry[1][1];
    $commitTableSVG.append(entryElem);
    self.width = currentX + entryElem.getBBox().width;
  }

  /**
   * Makes an SVG element
   * @param {string} tag
   * @param {Object} attrs
   * @return {*}
   */
  makeSVG(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    // eslint-disable-next-line guard-for-in
    for (const k in attrs) {
      el.setAttribute(k, attrs[k]);
    }
    return el;
  }

  /**
   * Gets the color of the row based on the indent
   * @return {string}
   */
  getColor() {
    const self = this;
    const colorNum = self.indent % 4;
    if (colorNum === 0) {
      return '\#00CC19';
    } else if (colorNum === 1) {
      return '\#0198A6';
    } else if (colorNum === 2) {
      return '\#FF7800';
    } else {
      return '\#FF0D00';
    }
  }
};
