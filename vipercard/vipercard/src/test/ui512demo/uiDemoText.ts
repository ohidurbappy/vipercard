
/* auto */ import { scontains } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { base10, cast } from '../../ui512/utils/utils512.js';
/* auto */ import { UI512EventType } from '../../ui512/draw/ui512Interfaces.js';
/* auto */ import { TextFontStyling, stringToTextFontStyling, textFontStylingToString } from '../../ui512/draw/ui512DrawTextClasses.js';
/* auto */ import { UI512DrawText } from '../../ui512/draw/ui512DrawText.js';
/* auto */ import { UI512ElGroup } from '../../ui512/elements/ui512ElementGroup.js';
/* auto */ import { GridLayout, UI512Application } from '../../ui512/elements/ui512ElementApp.js';
/* auto */ import { UI512BtnStyle, UI512ElButton } from '../../ui512/elements/ui512ElementButton.js';
/* auto */ import { MouseUpEventDetails } from '../../ui512/menu/ui512Events.js';
/* auto */ import { addDefaultListeners } from '../../ui512/textedit/ui512TextEvents.js';
/* auto */ import { UI512Presenter } from '../../ui512/presentation/ui512Presenter.js';
/* auto */ import { TestDrawUI512Text } from '../../test/ui512/testUI512DrawText.js';

/**
 * UI512DemoText
 *
 * A "demo" project showing text drawn in many fonts and alignments
 *
 * 1) tests use this project to compare against a known good screenshot,
 * to make sure rendering has not changed
 * 2) you can start this project in _rootUI512.ts_ to test combinations
 * of styles and fonts, by clicking the buttons like Bold and Italic
 */
export class UI512DemoText extends UI512Presenter {
    typeface = 'geneva';
    style: TextFontStyling = TextFontStyling.Default;
    demoText = 'File Edit Tools\n123 This is really good, it looks right to me! :) ^^ ### mniv';
    mixSizes = false;
    testrunner: TestDrawUI512Text;
    init() {
        super.init();
        addDefaultListeners(this.listeners);
        this.testrunner = new TestDrawUI512Text();
        this.testrunner.uiContext = true;

        let clientRect = this.getStandardWindowBounds();
        this.app = new UI512Application(clientRect, this);
        let grp = new UI512ElGroup('grpmain');
        this.app.addGroup(grp);
        this.inited = true;

        /* choose a font */
        let fonts = 'chicago,courier,geneva,new york,times,helvetica,monaco,symbol'.split(/,/);
        let layout = new GridLayout(65, 70, 70, 15, fonts, [1], 5, 5);
        layout.createElems(this.app, grp, 'btnSetFont:', UI512ElButton, () => {}, true, true);

        /* choose a style */
        let styles = 'biuosdce'.split('');
        let layoutv = new GridLayout(70, 90, 40, 15, [1], styles, 5, 5);
        layoutv.createElems(this.app, grp, 'btnSetStyle:', UI512ElButton, () => {}, true, true);

        /* choose alteration */
        let attributes = 'narrow,valign,halign,wrap,mixsizes,test,testdld1,testdld2,testdld3,testdld4'.split(/,/);
        layoutv = new GridLayout(130, 90, 65, 15, [1], attributes, 5, 5);
        layoutv.createElems(this.app, grp, 'btnSetAttr:', UI512ElButton, () => {}, true, true);

        /* caption: */
        let caption = new UI512ElButton('caption');
        grp.addElement(this.app, caption);
        caption.set('style', UI512BtnStyle.Opaque);
        caption.setDimensions(70, 300, 180, 15);

        let mainfield = new UI512ElButton('mainfield');
        grp.addElement(this.app, mainfield);
        mainfield.setDimensions(300, 120, 400, 250);
        this.drawTextDemo();
        this.invalidateAll();

        this.listenEvent(UI512EventType.MouseUp, UI512DemoText.respondMouseUp);
        this.rebuildFieldScrollbars();
    }

    drawTextDemo() {
        let s = this.typeface + ' ';
        s += textFontStylingToString(this.style);

        let demo = '';
        let listSizes = '10,12,14,18,24'.split(/,/g);
        let delim = '\n';
        if (this.mixSizes) {
            listSizes = '10,18,14,12,24'.split(/,/g);
            delim = '';
        }

        if (
            this.style === TextFontStyling.Default &&
            (this.typeface.toLowerCase() === 'chicago' ||
                this.typeface.toLowerCase() === 'geneva' ||
                this.typeface.toLowerCase() === 'monaco')
        ) {
            listSizes.splice(0, 0, '9');
        }

        for (let size of listSizes) {
            let font = this.typeface + '_' + size + '_' + textFontStylingToString(this.style);
            demo += UI512DrawText.setFont(this.demoText, font);
            demo += delim;
        }

        let caption = cast(this.app.getEl('caption'), UI512ElButton);
        caption.set('labeltext', s);

        let mainfield = cast(this.app.getEl('mainfield'), UI512ElButton);
        mainfield.set('labeltext', demo);
    }

    protected static respondMouseUp(pr: UI512DemoText, d: MouseUpEventDetails) {
        if (d.button !== 0) {
            return;
        }

        if (!d.elClick) {
            return;
        }

        let mainfield = cast(pr.app.getEl('mainfield'), UI512ElButton);
        if (d.elClick.id.startsWith('btnSetFont:')) {
            pr.typeface = d.elClick.id.split(':')[1];
        } else if (d.elClick.id.startsWith('btnSetStyle:')) {
            let styleletter = d.elClick.id.split(':')[1];
            let curStyle = textFontStylingToString(pr.style);
            if (scontains(curStyle, '+' + styleletter)) {
                curStyle = curStyle.replace(new RegExp('\\+' + styleletter), styleletter);
            } else {
                curStyle = curStyle.replace(new RegExp(styleletter), '+' + styleletter);
            }
            pr.style = stringToTextFontStyling(curStyle);
        } else if (d.elClick.id.startsWith('btnSetAttr:')) {
            let attr = d.elClick.id.split(':')[1];
            if (attr === 'mixsizes') {
                pr.mixSizes = !pr.mixSizes;
            } else if (attr === 'wrap') {
                mainfield.set('labelwrap', !mainfield.getB('labelwrap'));
            } else if (attr === 'halign') {
                mainfield.set('labelhalign', !mainfield.getB('labelhalign'));
            } else if (attr === 'valign') {
                mainfield.set('labelvalign', !mainfield.getB('labelvalign'));
            } else if (attr === 'narrow') {
                let newwidth = mainfield.w === 400 ? 100 : 400;
                mainfield.setDimensions(mainfield.x, mainfield.y, newwidth, mainfield.h);
            } else if (attr.startsWith('test')) {
                pr.runTest(attr);
            }
        }

        pr.drawTextDemo();
    }

    runTest(params: string) {
        if (params.startsWith('testdld')) {
            let testNumber = parseInt(params.substr('testdld'.length), base10);
            this.testrunner.runTest(testNumber, true);
        } else {
            this.testrunner.runTest(-1 /* all tests */, false);
        }
    }
}
