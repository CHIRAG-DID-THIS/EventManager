import { LightningElement } from 'lwc';

export default class Customerfooter extends LightningElement {

    handleScrollToTop() {
        // This is the standard browser API to scroll to the top of the page.
        // The 'smooth' behavior creates a nice scrolling animation.
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}