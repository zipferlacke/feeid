export default class Gestures {
    constructor(element) {
        this.element = element;
        this.xStart = null;
        this.yStart = null;
        this.attachTouchListeners();
    }

    attachTouchListeners() {
        this.element.addEventListener("touchstart", this.handleTouchStart.bind(this), false);
        this.element.addEventListener("touchmove", this.handleTouchMove.bind(this), false);
    }

    handleTouchStart(event) {
    this.xStart = event.touches[0].clientX;
    this.yStart = event.touches[0].clientY;
    }

    handleTouchMove(evt) {
        if (!this.xStart || !this.yStart) return;

        const xEnd = evt.touches[0].clientX;
        const yEnd = evt.touches[0].clientY;

        const xDiff = this.xStart - xEnd;
        const yDiff = this.yStart - yEnd;

        if (Math.abs(xDiff) > Math.abs(yDiff)) {
            if (xDiff > 0) {
                this.onLeft();
            } else if (xDiff < 0) {
                this.onRight();
            }
        } else {
            if (yDiff > 0) {
                this.onUp();
            } else if (yDiff < 0) {
                this.onDown();
            }
        }
    
        this.xStart = null;
        this.yStart = null;
    }
    
    onLeft(fn) {
        this.onLeft = fn;
        return this;
    }
    
    onRight(fn) {
        this.onRight = fn;
        return this;
    }
    
    onUp(fn) {
        this.onUp = fn;
        return this;
    }
    
    onDown(fn) {
        this.onDown = fn;
        return this;
    }
}