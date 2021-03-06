
/* auto */ import { O, assertTrue, cAltProductName, cProductName, checkThrow, makeVpcScriptErr } from '../../ui512/utils/utilsAssert.js';
/* auto */ import { Util512, checkThrowEq } from '../../ui512/utils/utils512.js';
/* auto */ import { CountNumericId } from '../../vpc/vpcutils/vpcUtils.js';
/* auto */ import { ChvIToken } from '../../vpc/codeparse/bridgeChv.js';
/* auto */ import { BuildFakeTokens, isTkType, tks, tokenType } from '../../vpc/codeparse/vpcTokens.js';
/* auto */ import { VpcChvParser } from '../../vpc/codeparse/vpcParser.js';
/* auto */ import { MapBuiltinCmds, VpcLineCategory } from '../../vpc/codepreparse/vpcPreparseCommon.js';
/* auto */ import { CheckReservedWords } from '../../vpc/codepreparse/vpcCheckReserved.js';
/* auto */ import { CodeSymbols, VpcCodeLine } from '../../vpc/codepreparse/vpcCodeLine.js';

/* see comment at the top of _vpcAllCode_.ts for an overview */

/**
 * determine the category of a line of code
 */
export class DetermineCategory {
    buildToken = new BuildFakeTokens();
    reusableRequestEval: ChvIToken;
    reusableRequestUserHandler: ChvIToken;
    constructor(
        protected idGen: CountNumericId,
        protected parser: VpcChvParser,
        protected mapBuiltinCmds: MapBuiltinCmds,
        protected check: CheckReservedWords
    ) {
        this.initFakeTokens();
    }

    /**
     * some variable names can't be used because they are separate tokens in the lexer
     * since a variable name must be a TkIdentifier token, if you tried to do this,
     * you'd get a weird "syntax error" instead of just saying "you can't use this variable name"
     *
     * so let's do a few basic checks here to try to give you a better error message
     */
    static checkCommonMistakenVarNames(tk: O<ChvIToken>) {
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkadjective),
            `8f|we don't support variables named "short", "long", etc`
        );

        checkThrow(!tk || !isTkType(tk, tks.TokenNumber), `8e|we don't support variables named "number"`);
        checkThrow(!tk || !isTkType(tk, tks.TokenLength), `Jj|we don't support variables named "length"`);
        checkThrow(!tk || !isTkType(tk, tks.TokenContains), `Ji|we don't support variables named "contains"`);
        checkThrow(!tk || !isTkType(tk, tks.TokenWithin), `8d|we don't support variables named "within"`);
        checkThrow(!tk || !isTkType(tk, tks.TokenId), `8c|we don't support variables named "id"`);
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkordinal),
            `Jh|we don't support variables with names like "first", "last", "second", "middle", "any"`
        );
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkcharorwordoritemorlineorplural),
            `Jg|we don't support variables with names like "char", "word", "item", "line"`
        );
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkmultdivideexpdivmod),
            `Jf|we don't support variables with names like "div", "mod"`
        );
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkbkgndorpluralsyn),
            `Je|we don't support variables with names like "bgs", "bkgnds", "backgrounds"`
        );
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkcardorpluralsyn),
            `Jd|we don't support variables with names like "cds", "cards"`
        );
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkbtnorpluralsyn),
            `Jc|we don't support variables with names like "btns", "buttons"`
        );
        checkThrow(
            !tk || !isTkType(tk, tks.TokenTkfldorpluralsyn),
            `8b|we don't support variables with names like "flds", "fields"`
        );
    }

    /**
     * determine the category
     */
    go(line: ChvIToken[]): VpcCodeLine {
        checkThrow(line && line.length > 0, "8O|we don't allow empty lines of code");
        checkThrow(
            isTkType(line[0], tks.TokenTkidentifier),
            "8N|The first word of this line is not a valid command or keyword.", line[0].image
        );

        let firstImage = line[0].image;
        let output = new VpcCodeLine(this.idGen.next(), line);
        if (this.mapBuiltinCmds.find(firstImage)) {
            /* this is a built in command */
            this.goBuiltinCmd(firstImage, line, output);
            return output;
        } else {
            /* this is either a syntax structure (like end repeat) or a custom handler call */
            let cmd = firstImage.replace(/\^/g, '');
            let method = 'go' + Util512.capitalizeFirst(cmd);
            method = Util512.isMethodOnClass(this, method) ? method : 'goCustomHandler';
            let ret = Util512.callAsMethodOnClass('DetermineCategory', this, method, [line, output], false);
            assertTrue(ret === undefined, '5v|expected undefined but got', ret);
            if (!output.getParseRule() && output.excerptToParse.length > 0) {
                if (output.ctg === VpcLineCategory.CallDynamic) {
                    /* specify parsing for 'send' */
                    output.excerptToParse = output.excerptToParse.slice();
                    output.setParseRule(this.parser.RuleBuiltinCmdSend);
                } else if (output.ctg === VpcLineCategory.GoCardImpl) {
                    /* specify parsing for 'goCardImpl' */
                    output.excerptToParse = output.excerptToParse.slice();
                    output.setParseRule(this.parser.RuleBuiltinInternalVpcGoCardImpl);
                } else if (this.isParsingNeeded(output.ctg)) {
                    /* construct an array to be sent to the parser */
                    output.excerptToParse = [this.reusableRequestEval].concat(output.excerptToParse);
                    output.setParseRule(this.parser.RuleTopLevelRequestEval);
                }
            }

            return output;
        }
    }

    /**
     * perf. optimization, many lines of code (like 'end repeat') don't need
     * to be sent to the parser since there is not expression to be evaluated.
     */
    protected isParsingNeeded(ctg: VpcLineCategory) {
        switch (ctg) {
            case VpcLineCategory.CallDynamic:
                checkThrow(false, 'call dynamic should be handled elsewhere')
                break
            case VpcLineCategory.GoCardImpl:
                checkThrow(false, 'go to card should be handled elsewhere')
                break
            case VpcLineCategory.HandlerStart: /* fall-through */
            case VpcLineCategory.HandlerEnd: /* fall-through */
            case VpcLineCategory.HandlerExit: /* fall-through */
            case VpcLineCategory.ProductExit: /* fall-through */
            case VpcLineCategory.HandlerPass: /* fall-through */
            case VpcLineCategory.IfElsePlain: /* fall-through */
            case VpcLineCategory.IfEnd: /* fall-through */
            case VpcLineCategory.RepeatExit: /* fall-through */
            case VpcLineCategory.RepeatNext: /* fall-through */
            case VpcLineCategory.RepeatForever: /* fall-through */
            case VpcLineCategory.RepeatEnd: /* fall-through */
            case VpcLineCategory.DeclareGlobal: /* fall-through */
                return false;
            default:
                return true;
        }
    }

    /**
     * this line is a call to a built in command like "put"
     */
    goBuiltinCmd(firstImage: string, line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.Statement;
        output.excerptToParse = line;
        output.setParseRule(this.mapBuiltinCmds.get(firstImage));
    }

    /**
     * this line is a call to a custom handler "myHandler 1,2,3"
     */
    goCustomHandler(line: ChvIToken[], output: VpcCodeLine) {
        if (line.length > 1) {
            /* kind reminders to the user */
            let firstToken = line[0];
            checkThrow(line[1].image !== '=', `8M|this isn't C... you need to use 'put 1 into x' not 'x = 1'`);
            checkThrow(
                !firstToken.endOffset || (line[1].image !== '(' || line[1].startOffset > firstToken.endOffset + 1),
                `8L|this isn't C... you need to say 'put fn() into x' or 'get fn()' but not 'fn()' alone`
            );
        }

        output.ctg = VpcLineCategory.CallHandler;
        checkThrow(
            this.check.okHandlerName(line[0].image),
            `8K|it looked like you were calling a handler like mouseUp or myHandler, but this is a reserved word.`
        );
        output.excerptToParse = [this.reusableRequestUserHandler].concat(line);
        output.setParseRule(this.parser.RuleTopLevelRequestHandlerCall);
    }

    /**
     * requestEvals are only added later
     */
    goRequestEval(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(false, `8J|we shouldn't reach this yet, we don't add them until after this step.`);
    }

    /**
     * this line is a handler start like "on mouseUp"
     */
    goHandlerStart(line: ChvIToken[], output: VpcCodeLine, firstToken: ChvIToken) {
        output.ctg = VpcLineCategory.HandlerStart;
        checkThrow(line.length > 1, `8F|cannot have a line that is just "on"`);
        DetermineCategory.checkCommonMistakenVarNames(line[1]);
        checkThrow(this.check.okHandlerName(line[1].image), `8E|name of handler is a reserved word.`);
        checkThrowEq(
            tokenType(tks.TokenTkidentifier),
            line[1].tokenType,
            `8D|expected "on myhandler" but got "on <invalid name>`
        );

        output.excerptToParse.push(firstToken); /* 'on' or 'function' */
        output.excerptToParse.push(line[1]); /* name of handler */
        this.getListOfValidIdentifiers(line, output, 2);
    }

    /**
     * this line is a handler start like "on mouseUp"
     */
    goOn(line: ChvIToken[], output: VpcCodeLine) {
        return this.goHandlerStart(line, output, line[0]);
    }

    /**
     * this line is a function start like "function myFunc"
     */
    goFunction(line: ChvIToken[], output: VpcCodeLine) {
        return this.goHandlerStart(line, output, line[0]);
    }

    /**
     * this line is declaring global variable(s)
     */
    goGlobal(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.DeclareGlobal;
        checkThrow(line.length > 1, `8C|cannot have a line that is just "global"`);
        this.getListOfValidIdentifiers(line, output, 1);
    }

    /**
     * this line is ending a block ("end if" or "end repeat" etc)
     */
    endStatementCommon(line: ChvIToken[], output: VpcCodeLine, s: string) {
        checkThrowEq(2, line.length, `8B|wrong line length, in '${s} myhandler'`);
        DetermineCategory.checkCommonMistakenVarNames(line[1]);
        checkThrow(
            this.check.okHandlerName(line[1].image),
            `8A|we think you are trying to say '${s} myhandler', but name of handler is a reserved word.`
        );
        checkThrowEq(
            tokenType(tks.TokenTkidentifier),
            line[1].tokenType,
            `89|expected "end myhandler" but name of my handler is not valid`
        );

        output.excerptToParse.push(line[0]);
        output.excerptToParse.push(line[1]);
    }

    /**
     * this line is ending a handler
     */
    goEndHandler(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.HandlerEnd;
        this.endStatementCommon(line, output, 'end');
    }

    /**
     * this line is exiting a handler
     */
    goExitHandler(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.HandlerExit;
        this.endStatementCommon(line, output, 'exit');
    }

    /**
     * this line is like "pass mouseUp"
     */
    goPass(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.HandlerPass;
        this.endStatementCommon(line, output, 'pass');
    }

    /**
     * this line is like "exit to ViperCard"
     */
    goExitProduct(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.ProductExit;
    }

    /**
     * this line is like "return x"
     */
    goReturn(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.ReturnExpr;
        checkThrow(
            line.length > 1,
            `88|cannot have a line that is just "return". if you really want to return void, try exit myhandler.`
        );
        output.excerptToParse = line.slice(1);
    }

    /**
     * this line is opening an if block
     */
    goIf(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.IfStart;
        let lastToken = line[line.length - 1];
        checkThrow(
            isTkType(lastToken, tks.TokenTkidentifier) && lastToken.image === 'then',
            `87|expected line to end with "then". 'if x > 2 then' `
        );

        checkThrow(line.length > 2, `86|cannot have a line that is just "if then"`);
        output.excerptToParse = line.slice(1, -1);
    }

    /**
     * this line is like "else if x > y then"
     */
    goElseIfCond(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(false, "we no longer expect to see an 'else if', it should have been expanded by vpcExpandIfElse")

        output.ctg = VpcLineCategory.IfElse;
        let lastToken = line[line.length - 1];
        checkThrow(
            isTkType(lastToken, tks.TokenTkidentifier) && lastToken.image === 'then',
            `85|expected line to end with "then". 'else if x > 3 then' `
        );
        checkThrow(line.length > 3, `84|cannot have a line that is just "else if then"`);
        checkThrow(
            isTkType(line[1], tks.TokenTkidentifier) && line[1].image === 'if',
            `83|expected line to be 'else if x > 3 then' but 'if' not seen`
        );

        output.excerptToParse = line.slice(2, -1);
    }

    /**
     * this line is like "else"
     */
    goElseIfPlain(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.IfElsePlain;
        checkThrowEq(1, line.length, `82|line should be just 'else'`);
    }

    /**
     * this line is like "end if"
     */
    goEndIf(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.IfEnd;
        checkThrowEq(2, line.length, `81|line should be just 'end if'`);
    }

    /**
     * this line begins with "else"
     */
    goElse(line: ChvIToken[], output: VpcCodeLine) {
        if (line.length > 1) {
            this.goElseIfCond(line, output);
        } else {
            this.goElseIfPlain(line, output);
        }
    }

    /**
     * this line is like "exit repeat"
     */
    goExitRepeat(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.RepeatExit;
        checkThrowEq(2, line.length, `Jb|line should be just 'exit repeat'`);
    }

    /**
     * this line is like "end repeat"
     */
    goEndRepeat(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.RepeatEnd;
        checkThrowEq(2, line.length, `7~|line should be just 'end repeat'`);
    }

    /**
     * this line is like "next repeat"
     */
    goNext(line: ChvIToken[], output: VpcCodeLine) {
        output.ctg = VpcLineCategory.RepeatNext;
        checkThrowEq(2, line.length, `7}|line should be just 'next repeat'`);
        checkThrow(
            isTkType(line[1], tks.TokenTkidentifier) && line[1].image === 'repeat',
            `7||line should be just 'next repeat'`
        );
    }

    /**
     * this line is beginning a repeat
     * note that the structure repeat with x = 1 to 5 is handled elsewhere
     */
    goRepeat(line: ChvIToken[], output: VpcCodeLine) {
        if (line.length === 1) {
            output.ctg = VpcLineCategory.RepeatForever;
        } else if (isTkType(line[1], tks.TokenTkidentifier) && line[1].image === 'while') {
            output.ctg = VpcLineCategory.RepeatWhile;
            checkThrow(line.length > 2, `7{|can't have "repeat while" without an expression`);
            output.excerptToParse = line.slice(2);
        } else if (isTkType(line[1], tks.TokenTkidentifier) && line[1].image === 'until') {
            output.ctg = VpcLineCategory.RepeatUntil;
            checkThrow(line.length > 2, `9e|can't have "repeat until" without an expression`);
            output.excerptToParse = line.slice(2);
        } else {
            throw makeVpcScriptErr(
                `5u|unsupported repeat type. need repeat forever, repeat 5 times, repeat with, repeat while, repeat until.`
            );
        }
    }

    /**
     * the line begins with "end"
     */
    goEnd(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(line.length > 1, `7_|cannot have a line that is just "end"`);
        checkThrowEq(2, line.length, `7^|wrong line length. expected "end if", "end repeat", "end handler"`);
        checkThrowEq(
            tokenType(tks.TokenTkidentifier),
            line[1].tokenType,
            `7]|expected one of: "end if", "end repeat", "end handler"`
        );

        if (line[1].image === 'if') {
            return this.goEndIf(line, output);
        } else if (line[1].image === 'repeat') {
            return this.goEndRepeat(line, output);
        } else {
            return this.goEndHandler(line, output);
        }
    }

    /**
     * the line begins with "exit"
     */
    goExit(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(line.length > 1, `7[|cannot have a line that is just "exit"`);
        checkThrow(
            line.length === 2,
            `7@|wrong line length, expected "exit myhandler", "exit repeat", "exit to ${cProductName}"`
        );
        checkThrowEq(
            tokenType(tks.TokenTkidentifier),
            line[1].tokenType,
            `7?|expected "exit myhandler", "exit repeat", "exit to ${cProductName}"`
        );

        if (line[1].image === 'repeat') {
            return this.goExitRepeat(line, output);
        } else if (line[1].image === cProductName.toLowerCase() || line[1].image === cAltProductName.toLowerCase()) {
            return this.goExitProduct(line, output);
        } else {
            return this.goExitHandler(line, output);
        }
    }

    /**
     * line begins with do
     */
    goDo(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(false, `expected do to have been turned to send.`);
    }

    /**
     * line begins with send
     */
    goSend(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(line.length >= 2, `line is too short.`);

        /* other control blocks just parse a single expression,
        but this has to parse both an expression and an object */
        output.excerptToParse = line.slice()
        output.ctg = VpcLineCategory.CallDynamic;
    }

    /**
     * line begins with goCardImpl
     */
    goBuiltinInternalVpcGoCardImpl(line: ChvIToken[], output: VpcCodeLine) {
        checkThrow(line.length >= 2, `line is too short.`);

        /* other control blocks just parse a single expression,
        but this has to parse a refrence to a card */
        output.excerptToParse = line.slice()
        output.ctg = VpcLineCategory.GoCardImpl;
    }

    /**
     * for a line like "on myHandler a,b,c"
     * we ensure that it is alternating commas and TkIdentifiers
     * returns the list of TkIdentifiers
     */
    protected getListOfValidIdentifiers(line: ChvIToken[], output: VpcCodeLine, index: number) {
        for (let i = index; i < line.length; i++) {
            DetermineCategory.checkCommonMistakenVarNames(line[i]);
            checkThrow(this.check.okLocalVar(line[i].image), `8I|name of parameter is a reserved word.`);

            if ((i - index) % 2 === 1) {
                checkThrowEq(
                    tokenType(tks.TokenTkcomma),
                    line[i].tokenType,
                    `8H|required comma every other param (expected on myhandler x, y, z)`,
                    line[i].image
                );
            } else {
                checkThrowEq(
                    tokenType(tks.TokenTkidentifier),
                    line[i].tokenType,
                    `8G|parameter is not a valid variable name (expected on myhandler x, y, z)`,
                    line[i].image
                );

                output.excerptToParse.push(line[i]);
            }
        }
    }

    /**
     * make re-usable fake tokens to be sent to the parser
     */
    protected initFakeTokens() {
        /* re-usable fake token, to tell the parser to evaluate an expression */
        this.reusableRequestEval = {
            image: CodeSymbols.RequestEval,
            startOffset: -1,
            startLine: -1,
            startColumn: -1,
            endOffset: -1,
            endLine: -1,
            endColumn: -1,
            isInsertedInRecovery: false,
            tokenType: tokenType(tks.TokenTkidentifier),
            tokenClassName: undefined
        };

        /* re-usable fake token, to tell the parser to evaluate
        a list of expressions separated by commas */
        this.reusableRequestUserHandler = {
            image: CodeSymbols.RequestHandlerCall,
            startOffset: -1,
            startLine: -1,
            startColumn: -1,
            endOffset: -1,
            endLine: -1,
            endColumn: -1,
            isInsertedInRecovery: false,
            tokenType: tokenType(tks.TokenTkidentifier),
            tokenClassName: undefined
        };
    }
}
