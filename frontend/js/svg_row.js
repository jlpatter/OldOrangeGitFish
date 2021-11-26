/**
 * A row in the svg table.
 */
module.exports = class SVGRow {
  /**
   * Construct the svg row
   * @param {string} sha
   * @param {Array<string>} parentShas
   * @param {Array<string>} childrenShas
   * @param {int} x
   * @param {int} y
   * @param {Array} entry
   */
  constructor(sha, parentShas, childrenShas, x, y, entry) {
    this.sha = sha;
    this.parentShas = parentShas;
    this.childrenShas = childrenShas;
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
   * Gets the SVGRow parents
   * @param {Array<SVGRow>} array
   * @return {Array<SVGRow>}
   */
  getChildSVGRows(array) {
    const self = this;
    if (self.childrenShas.length === 0) {
      return [];
    }
    const childSVGRows = [];
    for (let i = 0; i < self.childrenShas.length; i++) {
      for (let j = 0; j < array.length; j++) {
        if (self.childrenShas[i] === array[j].sha) {
          childSVGRows.push(array[j]);
          break;
        }
      }
    }
    return childSVGRows;
  }

  /**
   * Draw each of the components of the svg row.
   * @param {jQuery} $commitTableSVG
   * @param {Array<SVGRow>} parentSVGRows
   * @param {Array<SVGRow>} childSVGRows
   * @param {Object} mainTable
   */
  draw($commitTableSVG, parentSVGRows, childSVGRows, mainTable) {
    const self = this;

    // Set the current node position as occupied (or find a position that's unoccupied and occupy it).
    if (!(self.y in mainTable)) {
      mainTable[self.y] = {};
      mainTable[self.y][self.x] = true;
    } else if (!(self.x in mainTable[self.y])) {
      mainTable[self.y][self.x] = true;
    } else if (mainTable[self.y][self.x] === true) {
      let foundEmpty = false;
      while (!foundEmpty) {
        self.x++;
        if (!(self.x in mainTable[self.y])) {
          foundEmpty = true;
          mainTable[self.y][self.x] = true;
        }
      }
    }

    // Set the space of the line from the current node to its parents as occupied.
    const pixelX = self.x * 20 + 20;
    const pixelY = self.y * 30 + 20;
    const color = self.getColor(self.x);
    if (parentSVGRows.length > 0) {
      for (let i = 0; i < parentSVGRows.length; i++) {
        // ParentSVGRows are lower on the graph (with a higher y value).
        for (let j = self.y + 1; j < parentSVGRows[i].y; j++) {
          if (!(j in mainTable)) {
            mainTable[j] = {};
            mainTable[j][self.x] = true;
          } else if (!(self.x in mainTable[j])) {
            mainTable[j][self.x] = true;
          }
        }
      }
    }

    // Draw the lines from the current node to its children.
    if (childSVGRows.length > 0) {
      for (let i = 0; i < childSVGRows.length; i++) {
        const childPixelX = childSVGRows[i].x * 20 + 20;
        const childPixelY = childSVGRows[i].y * 30 + 20;
        const beforePixelY = (self.y - 1) * 30 + 20;
        const svgLine = self.makeSVG('line', {x1: childPixelX, y1: childPixelY, x2: childPixelX, y2: beforePixelY, style: 'stroke:' + self.getColor(childSVGRows[i].x) + ';stroke-width:4'});
        const angledSVGLine = self.makeSVG('line', {x1: childPixelX, y1: beforePixelY, x2: pixelX, y2: pixelY, style: 'stroke:' + self.getColor(childSVGRows[i].x) + ';stroke-width:4'});
        $commitTableSVG.append(svgLine);
        $commitTableSVG.append(angledSVGLine);
      }
    }

    // Now draw the node.
    const svgCircle = self.makeSVG('circle', {'cx': pixelX, 'cy': pixelY, 'r': 10, 'stroke': color, 'stroke-width': 1, 'fill': color});
    $commitTableSVG.append(svgCircle);

    // Draw the branch text.
    const occupiedRowNums = Object.keys(mainTable[self.y]);
    let largestXValue = 0;
    for (let i = 0; i < occupiedRowNums.length; i++) {
      largestXValue = Math.max(largestXValue, Number(occupiedRowNums[i]));
    }
    let currentX = (largestXValue + 1) * 20 + 20;
    self.entry[0].forEach(function(branch) {
      const branchText = '(' + branch + ') ';
      const svgTextElem = self.makeSVG('text', {x: currentX, y: pixelY + 6, fill: color});
      svgTextElem.textContent = branchText;
      $commitTableSVG.append(svgTextElem);
      currentX += svgTextElem.getBBox().width + 5;
    });

    // Draw the summary text.
    const entryElem = self.makeSVG('text', {x: currentX, y: pixelY + 6, fill: 'white'});
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
   * @param {number} xValue
   * @return {string}
   */
  getColor(xValue) {
    const colorNum = xValue % 4;
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
