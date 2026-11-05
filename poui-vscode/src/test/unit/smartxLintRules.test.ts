import * as assert from 'node:assert';
import {
  applySmartxFixes,
  isKnownLegendColor,
  lintSmartxSource,
  SMARTX_RULE_IDS,
  stripAdvplComments,
} from '../../smartxLintRules';
import { LintFinding } from '../../lintRules';

function ids(findings: LintFinding[]): string[] {
  return findings.map((f) => f.id);
}

function only(findings: LintFinding[], id: string): LintFinding[] {
  return findings.filter((f) => f.id === id);
}

const MBROWSE_OK = `#include "protheus.ch"
#include "fwmbrowse.ch"

User Function ZA0BRW()
    Local aCores := {}
    aAdd(aCores, {"ZA0_STATUS == '1'", "ENABLE", "Ativo"})
    aAdd(aCores, {"ZA0_STATUS == '3'", "BR_LARANJA", "Suspenso",,, "caption-tag-07"})
    If hasSmartX()
        setSmartX(1, .T.)
    EndIf
    mBrowse(6, 1, 22, 75, "ZA0",,,,,, aCores)
Return
`;

const MODEL_OK = `#include 'fw-tlpp-core.th'
#include "protheus.ch"
#include "totvs.framework.structure.model.th"

namespace custom.cadastro.autor.model

@totvsFrameworkStructureModel(lookup=.F., country="ALL", description="Autores")
class ZA0CAD from totvs.framework.structure.model.data
    public method new() as object
    public method setModel()
EndClass

method setModel() class ZA0CAD
    local oAct as object
    local oEvents as object
    oAct := totvs.framework.structure.interface.BuildAdvplAction():new()
    oAct:setRoutine("custom.cadastro.autor.model.BuscaCEP")
    oAct:setHasResponse(.T.)
    oAct:setAction(oSetFields:getAction())
    oEvents := totvs.framework.structure.interface.BuildEvents():new()
    oEvents:addOnChange({"dataNew"}, {"ZA0_CEP"}, oAct:getAction())
    oEvents:addOnChange({"dataEdit"}, {"ZA0_CEP"}, oAct:getAction())
    self:addTriggers(oEvents:getEvents())
return
`;

describe('smartxLintRules — rule catalog', () => {
  it('exposes the 11 rules SX01..SX11 in order', () => {
    assert.deepStrictEqual(SMARTX_RULE_IDS, [
      'SX01', 'SX02', 'SX03', 'SX04', 'SX05', 'SX06', 'SX07', 'SX08', 'SX09', 'SX10', 'SX11',
    ]);
  });

  it('reports nothing for compliant mBrowse and model sources', () => {
    assert.deepStrictEqual(lintSmartxSource('ZA0BRW.prw', MBROWSE_OK), []);
    assert.deepStrictEqual(lintSmartxSource('za0cad.model.tlpp', MODEL_OK), []);
  });
});

describe('stripAdvplComments', () => {
  it('blanks // and /* */ comments but keeps strings and line count', () => {
    const src = 'a := "http://x" // setSmartX(1)\n/* DbSetFilter(\n */ b := 1';
    const out = stripAdvplComments(src);
    assert.strictEqual(out.length, src.length);
    assert.strictEqual(out.split('\n').length, src.split('\n').length);
    assert.ok(out.includes('"http://x"'));
    assert.ok(!/setSmartX|DbSetFilter/.test(out));
  });

  it('ignores rules that only appear inside comments', () => {
    const src = '// oEvents:addOnChange({"dataNew","dataEdit"}, {"A","B"}, x)\n/* self:addValidators(x) */';
    assert.deepStrictEqual(lintSmartxSource('x.tlpp', src), []);
  });
});

describe('SX01 — legend color without PO-UI color', () => {
  it('flags an mBrowse legend item with a color outside the de-para', () => {
    const src = MBROWSE_OK.replace('"BR_LARANJA", "Suspenso",,, "caption-tag-07"', '"BR_LARANJA", "Suspenso"');
    const f = only(lintSmartxSource('ZA0BRW.prw', src), 'SX01');
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].severity, 'ERROR');
    assert.strictEqual(f[0].line, 7);
    assert.ok(f[0].message.includes('BR_LARANJA'));
  });

  it('flags AddLegend on FWMBrowse with an unknown bitmap and no 6th parameter', () => {
    const src = `#include "fwmbrowse.ch"
Function X()
  oBrowse := FWMBrowse():New()
  oBrowse:AddLegend("ZA0_STATUS == '1'", "CANCEL", "Cancelado")
  oBrowse:AddLegend("ZA0_STATUS == '2'", "GREEN", "Ativo")
  oBrowse:AddLegend("ZA0_STATUS == '3'", "LBOK", "Ok",,, "caption-tag-13")
  If hasSmartX()
    oBrowse:setSmartX(1, .T.)
  EndIf
  oBrowse:Activate()
Return`;
    const f = only(lintSmartxSource('x.prw', src), 'SX01');
    assert.deepStrictEqual(f.map((x) => x.line), [4]);
  });

  it('accepts de-para colors case-insensitively and caption-tag/color tokens as cColor', () => {
    assert.ok(isKnownLegendColor('br_azul.bmp'));
    assert.ok(isKnownLegendColor('Verde_Escuro'));
    assert.ok(isKnownLegendColor('BR_PRETO_A'));
    assert.ok(isKnownLegendColor('caption-tag-21'));
    assert.ok(isKnownLegendColor('color-07'));
    assert.ok(!isKnownLegendColor('BR_LARANJA'));
    assert.ok(!isKnownLegendColor('CANCEL'));
  });

  it('does not flag legends when the source does not enable Smart X', () => {
    const src = `User Function X()
  Local aCores := {}
  aAdd(aCores, {"A == '1'", "CANCEL", "Cancelado"})
  mBrowse(6, 1, 22, 75, "ZA0",,,,,, aCores)
Return`;
    assert.deepStrictEqual(only(lintSmartxSource('x.prw', src), 'SX01'), []);
  });

  it('does not treat aRotina arrays as legends', () => {
    const src = MBROWSE_OK.replace(
      'Return\n',
      `Return\nStatic Function MenuDef()\n  Local aRotina := {}\n  aAdd(aRotina, {'Incluir', 'VIEWDEF.ZA0', 0, 3, 0, NIL})\nReturn aRotina\n`,
    );
    assert.deepStrictEqual(only(lintSmartxSource('x.prw', src), 'SX01'), []);
  });
});

describe('SX02 / SX03 — addOnChange contexts and fields', () => {
  it('SX02: flags grouped contexts as WARNING (fixable)', () => {
    const src = 'oEvents:addOnChange({"dataNew", "dataEdit"}, {"A1_CEP"}, oAct:getAction())';
    const f = only(lintSmartxSource('m.tlpp', src), 'SX02');
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].severity, 'WARNING');
    assert.strictEqual(f[0].fixable, true);
  });

  it('SX03: flags more than one field as ERROR', () => {
    const src = 'oEvents:addOnChange({"dataNew"}, {"A1_CEP", "A1_EST"}, oAct:getAction())';
    const f = lintSmartxSource('m.tlpp', src);
    assert.deepStrictEqual(ids(f), ['SX03']);
    assert.strictEqual(f[0].severity, 'ERROR');
  });

  it('does not flag addOnLoad with an empty fields argument', () => {
    const src = 'oEvents:addOnLoad({"dataNew"},, oAct:getAction())';
    assert.deepStrictEqual(lintSmartxSource('m.tlpp', src), []);
  });
});

describe('SX04 — events registered on the Interface', () => {
  it('flags oInterface:setEvents', () => {
    const src = 'self:oInterface:setEvents( oEvents:getEvents() )';
    assert.deepStrictEqual(ids(lintSmartxSource('i.tlpp', src)), ['SX04']);
  });

  it('flags any setEvents in a source annotated as Interface', () => {
    const src = '@totvsFrameworkStructureInterface(lookup=.F., country="ALL", description="X")\nclass X\nEndClass\nmethod setInterface() class X\n  ::setEvents(oEv)\nreturn';
    const f = only(lintSmartxSource('i.tlpp', src), 'SX04');
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].line, 5);
  });

  it('does not flag setEvents of a lifecycle handler in the Model', () => {
    const src = '@totvsFrameworkStructureModel(lookup=.F., country="ALL", description="X")\nmethod setModel() class X\n  self:setEvents(oEventsHandler)\nreturn';
    assert.deepStrictEqual(lintSmartxSource('m.tlpp', src), []);
  });
});

describe('SX05 / SX06 / SX11 — setSmartX usage', () => {
  it('SX05 + SX06: setSmartX without hasSmartX nor fwmbrowse.ch', () => {
    const src = 'Function X()\n  oBrowse:setSmartX(1, .T.)\n  oBrowse:Activate()\nReturn';
    assert.deepStrictEqual(ids(lintSmartxSource('x.prw', src)).sort(), ['SX05', 'SX06']);
  });

  it('SX06 is fixable and the fix inserts the include after the last #include', () => {
    const src = '#include "protheus.ch"\r\n#include "fwmvcdef.ch"\r\nFunction X()\r\n  If hasSmartX()\r\n    oB:setSmartX(1)\r\n  EndIf\r\nReturn\r\n';
    const findings = lintSmartxSource('x.prw', src);
    assert.ok(only(findings, 'SX06')[0].fixable);
    const fixed = applySmartxFixes(src);
    assert.deepStrictEqual(fixed.appliedFixIds, ['SX06']);
    assert.ok(fixed.content.startsWith('#include "protheus.ch"\r\n#include "fwmvcdef.ch"\r\n#include "fwmbrowse.ch"\r\nFunction X()'));
    assert.deepStrictEqual(only(lintSmartxSource('x.prw', fixed.content), 'SX06'), []);
  });

  it('SX11: setSmartX() function form outside the function that calls mBrowse', () => {
    const src = `#include "fwmbrowse.ch"
User Function A()
  If hasSmartX()
    setSmartX(1, .T.)
  EndIf
  U_B()
Return
User Function B()
  mBrowse(6, 1, 22, 75, "ZA0")
Return`;
    const f = only(lintSmartxSource('x.prw', src), 'SX11');
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].line, 4);
  });

  it('SX11 does not fire for the FWMBrowse method form', () => {
    const src = '#include "fwmbrowse.ch"\nFunction X()\n  If hasSmartX()\n    oBrowse:setSmartX(1, .T.)\n  EndIf\nReturn';
    assert.deepStrictEqual(lintSmartxSource('x.prw', src), []);
  });
});

describe('SX07 / SX08 — filters in a Smart X source', () => {
  const head = '#include "fwmbrowse.ch"\nFunction X()\n  If hasSmartX()\n    oBrowse:setSmartX(1)\n  EndIf\n';

  it('SX07: SetFilterDefault/AddFilterSmartX literal without @', () => {
    const src = `${head}  oBrowse:SetFilterDefault("ZA0_STATUS <> '9'")\n  oBrowse:AddFilterSmartX("@ ZA0_TIPO = '1'")\nReturn`;
    const f = only(lintSmartxSource('x.prw', src), 'SX07');
    assert.deepStrictEqual(f.map((x) => x.line), [6]);
  });

  it('SX08: DbSetFilter is ignored by the converted browse', () => {
    const src = `${head}  ZA0->(DbSetFilter({|| .T.}, ".T."))\nReturn`;
    assert.deepStrictEqual(ids(lintSmartxSource('x.prw', src)), ['SX08']);
  });

  it('does not apply SX07/SX08 to sources without setSmartX', () => {
    const src = 'Function X()\n  oBrowse:SetFilterDefault("A == 1")\n  DbSetFilter({|| .T.}, ".T.")\nReturn';
    assert.deepStrictEqual(lintSmartxSource('x.prw', src), []);
  });
});

describe('SX09 / SX10 — validators and advpl actions', () => {
  it('SX09: addValidators is reported as INFO', () => {
    const f = lintSmartxSource('m.tlpp', 'self:addValidators(oEvents:getEvents())');
    assert.deepStrictEqual(ids(f), ['SX09']);
    assert.strictEqual(f[0].severity, 'INFO');
  });

  it('SX10: BuildAdvplAction with setAction but without setHasResponse(.T.)', () => {
    const src = MODEL_OK.replace('    oAct:setHasResponse(.T.)\n', '');
    const f = only(lintSmartxSource('m.tlpp', src), 'SX10');
    assert.strictEqual(f.length, 1);
    assert.strictEqual(f[0].line, 16);
  });

  it('SX10 does not fire when the action has no chained setAction', () => {
    const src = 'oA := totvs.framework.structure.interface.BuildAdvplAction():new()\noA:setRoutine("MsgInfo")';
    assert.deepStrictEqual(lintSmartxSource('m.tlpp', src), []);
  });
});

describe('applySmartxFixes — SX02', () => {
  it('splits grouped contexts into one call per context keeping indentation', () => {
    const src = 'method m() class X\n    oEvents:addOnChange({"dataNew", "dataEdit"}, {"A1_CEP"}, oAct:getAction())\nreturn\n';
    const fixed = applySmartxFixes(src);
    assert.deepStrictEqual(fixed.appliedFixIds, ['SX02']);
    assert.strictEqual(
      fixed.content,
      'method m() class X\n    oEvents:addOnChange({"dataNew"}, {"A1_CEP"}, oAct:getAction())\n    oEvents:addOnChange({"dataEdit"}, {"A1_CEP"}, oAct:getAction())\nreturn\n',
    );
    assert.deepStrictEqual(lintSmartxSource('m.tlpp', fixed.content), []);
  });

  it('leaves multi-line calls untouched', () => {
    const src = 'oEvents:addOnChange({"dataNew", "dataEdit"}, ;\n  {"A1_CEP"}, oAct:getAction())';
    const fixed = applySmartxFixes(src);
    assert.deepStrictEqual(fixed.appliedFixIds, []);
    assert.strictEqual(fixed.content, src);
  });
});
