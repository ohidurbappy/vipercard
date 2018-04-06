
/* auto */ import { assertEq } from '../../ui512/utils/utilsUI512.js';
/* auto */ import { RectUtils } from '../../ui512/utils/utilsDraw.js';
/* auto */ import { UI512Element } from '../../ui512/elements/ui512ElementsBase.js';
/* auto */ import { UI512ElGroup } from '../../ui512/elements/ui512ElementsGroup.js';
/* auto */ import { UI512Application } from '../../ui512/elements/ui512ElementsApp.js';
/* auto */ import { UI512ElLabel } from '../../ui512/elements/ui512ElementsLabel.js';
/* auto */ import { UI512BtnStyle, UI512ElButton } from '../../ui512/elements/ui512ElementsButton.js';
/* auto */ import { UI512ControllerBase } from '../../ui512/presentation/ui512PresenterBase.js';

export class BorderDecorationConsts {
    headHeight = 0;
    fillshrinkX = 0;
    fillshrinkY = 0;
    closeBtnBgWidth = 0;
    closeBtnWidth = 0;
    closeBtnHeight = 0;
    closeBtnX = 0;
    closeBtnY = 0;
    filliconset = '';
    filliconnumber = 0;
    filliconadjustx = 0;
    filliconadjusty = 0;
    footer = 2;
}

export class PalBorderDecorationConsts extends BorderDecorationConsts {
    readonly headHeight = 11;
    readonly fillshrinkX = -1;
    readonly fillshrinkY = -1;
    readonly filliconset = '000';
    readonly filliconnumber = 2;
    readonly filliconadjusty = 1;
    readonly closeBtnBgWidth = 11;
    readonly closeBtnWidth = 7;
    readonly closeBtnHeight = 7;
    readonly closeBtnX = 8;
    readonly closeBtnY = 2;
}

export class WndBorderDecorationConsts extends BorderDecorationConsts {
    readonly headHeight = 19;
    readonly fillshrinkX = 1;
    readonly fillshrinkY = 2;
    readonly filliconset = '000';
    readonly filliconnumber = 3;
    readonly filliconadjusty = 1;
    readonly closeBtnBgWidth = 13;
    readonly closeBtnWidth = 11;
    readonly closeBtnHeight = 11;
    readonly closeBtnX = 9;
    readonly closeBtnY = 4;
}

export abstract class UI512CompBase {
    idprefix = '';
    readonly grpid: string;
    readonly compositeId: string;
    compositeType = '';
    children: UI512Element[] = [];

    // logical dimensions. it is ok if children extend beyond these boundaries.
    logicalWidth = 0;
    logicalHeight = 0;
    x = 0;
    y = 0;

    constructor(compositeId: string) {
        this.compositeId = compositeId;
        this.grpid = this.getElId('composite');
    }

    getElId(suffix: string) {
        return this.compositeId + '##' + this.compositeType + '##' + suffix;
    }

    fromFullId(fullid: string) {
        let parts = fullid.split(this.compositeId + '##' + this.compositeType + '##');
        if (parts.length !== 2) {
            return undefined;
        } else {
            return parts[1];
        }
    }

    moveAllTo(newx: number, newy: number, app: UI512Application) {
        let dx = newx - this.x;
        let dy = newy - this.y;
        if (dx !== 0 && dy !== 0) {
            this.x += dx;
            this.y += dy;
            for (let el of this.children) {
                el.setDimensions(el.x + dx, el.y + dy, el.w, el.h);
            }
        }
    }

    protected genBtn(app: UI512Application, grp: UI512ElGroup, shortid: string) {
        return this.genChild(app, grp, shortid, UI512ElButton);
    }

    protected genChild<T extends UI512Element>(
        app: UI512Application,
        grp: UI512ElGroup,
        shortid: string,
        ctor: { new (...args: any[]): T }
    ): T {
        let el = new ctor(this.getElId(shortid));
        grp.addElement(app, el);
        this.children.push(el);
        return el;
    }

    abstract createSpecific(app: UI512Application): void;

    create(c: UI512ControllerBase, app: UI512Application) {
        assertEq(0, this.children.length, `2v|creating composite twice? ${this.compositeId}`);
        if (!app.findGroup(this.grpid)) {
            let grp = new UI512ElGroup(this.grpid, app.observer);
            app.addGroup(grp);
        }

        this.createSpecific(app);
        c.rebuildFieldScrollbars();
    }

    destroy(c: UI512ControllerBase, app: UI512Application) {
        this.children.length = 0;
        app.removeGroup(this.grpid);
        c.rebuildFieldScrollbars();
    }

    protected drawWindowDecoration(app: UI512Application, c: BorderDecorationConsts, hasclosebtn: boolean) {
        let grp = app.getGroup(this.grpid);

        // draw background+shadow
        let headerbox = this.genBtn(app, grp, 'headerbox');
        headerbox.set('autohighlight', false);
        headerbox.setDimensions(this.x, this.y, this.logicalWidth, c.headHeight);

        // get header fill rect
        if (c.fillshrinkX >= 0) {
            let fillrect = RectUtils.getSubRectRaw(
                this.x,
                this.y,
                this.logicalWidth,
                c.headHeight,
                c.fillshrinkX,
                c.fillshrinkY
            );
            if (!fillrect) {
                return c.headHeight;
            }

            // draw header fill
            let headerfill = this.genBtn(app, grp, 'headerfill');
            headerfill.set('style', UI512BtnStyle.opaque);
            headerfill.set('autohighlight', false);
            headerfill.set('iconsetid', c.filliconset);
            headerfill.set('iconnumber', c.filliconnumber);
            headerfill.set('iconadjustx', c.filliconadjustx);
            headerfill.set('iconadjusty', c.filliconadjusty);
            headerfill.setDimensions(fillrect[0], fillrect[1], fillrect[2], fillrect[3]);
        } else {
            headerbox.set('iconsetid', c.filliconset);
            headerbox.set('iconnumber', c.filliconnumber);
            headerbox.set('iconadjustx', c.filliconadjustx);
            headerbox.set('iconadjusty', c.filliconadjusty);
        }

        if (hasclosebtn) {
            // draw background for close button
            let closebtnbg = this.genBtn(app, grp, 'closebtnbg');
            closebtnbg.set('style', UI512BtnStyle.opaque);
            closebtnbg.set('autohighlight', false);
            let clx = c.closeBtnX - Math.floor((c.closeBtnBgWidth - c.closeBtnWidth) / 2);
            closebtnbg.setDimensions(this.x + clx, this.y + 1, c.closeBtnBgWidth, c.headHeight - 2);

            // draw close button
            let closebtn = this.genBtn(app, grp, 'closebtn');
            closebtn.set('autohighlight', true);
            closebtn.setDimensions(this.x + c.closeBtnX, this.y + c.closeBtnY, c.closeBtnWidth, c.closeBtnHeight);
        }

        // draw caption
        if (c instanceof WndBorderDecorationConsts) {
            let caption = this.genChild(app, grp, 'caption', UI512ElLabel);
            caption.set('transparentExceptChars', true);
            caption.set('labeltext', '');
            caption.set('labelwrap', false);
            caption.set('labelhalign', true);
            caption.set('labelvalign', true);
            caption.setDimensions(headerbox.x, headerbox.y, headerbox.w, headerbox.h);
        }

        return c.headHeight;
    }

    setVisible(app: UI512Application, visible: boolean) {
        let grp = app.getGroup(this.grpid);
        grp.setVisible(visible);
    }
}
