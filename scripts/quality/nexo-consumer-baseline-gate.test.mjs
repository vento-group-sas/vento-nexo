import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_PACKAGES,
  CONSUMER_REPOSITORY,
  NEXO_RELATIONS,
  REQUIRED_EVIDENCE_FIELDS,
  SURFACES,
  containsSensitiveData,
  evaluateProfile,
  evaluateSurface,
  evidenceIsStale,
  resolveTargetPackages,
  sha256Identity,
  validateEvidence,
} from './nexo-consumer-baseline-gate.mjs';

const positiveSurfaceScenarios = Object.freeze({
  'NEXO-SURFACE-001': { session: true, permission: true, expired: false },
  'NEXO-SURFACE-002': {
    site_id: 'SITE-001',
    location_id: 'LOC-001',
    allowed_locations: ['LOC-001'],
    manipulated: false,
  },
  'NEXO-SURFACE-003': {
    product_id: 'PROD-001',
    canonical_unit: 'unit',
    presentation_valid: true,
    category_is_not_physical_contract: true,
  },
  'NEXO-SURFACE-004': { balance: 12, requested: 3, implicit_conversion: false },
  'NEXO-SURFACE-005': {
    operation_id: 'MOV-001',
    quantity: 2,
    origin_sufficient: true,
    duplicate: false,
    transition_legal: true,
  },
  'NEXO-SURFACE-006': {
    location_id: 'LOC-001',
    authorized_location_id: 'LOC-001',
    device_location_id: 'LOC-001',
  },
  'NEXO-SURFACE-007': {
    authorized_actor: true,
    quantity: 4,
    from_state: 'IN_TRANSIT',
    to_state: 'PARTIAL_RECEIVED',
  },
  'NEXO-SURFACE-008': {
    pending: 10,
    received: 4,
    remaining_after: 6,
    closes_document: false,
  },
  'NEXO-SURFACE-009': {
    asset_id: 'ASSET-001',
    serialized_identity_preserved: true,
    location_preserved: true,
    collapsed_to_fungible: false,
  },
  'NEXO-SURFACE-010': {
    authorized: true,
    route_valid: true,
    site_valid: true,
    unit_policy_valid: true,
  },
  'NEXO-SURFACE-011': {
    contract_consumed: true,
    claimed_owner: 'inventory',
  },
  'NEXO-SURFACE-012': {
    server_render: true,
    client_render: true,
    hydration_mismatch: false,
    interaction_ok: true,
    accessibility_ok: true,
    print_preview_ok: true,
  },
});

const negativeSurfaceScenarios = Object.freeze({
  'NEXO-SURFACE-001': { session: false, permission: true, expired: false },
  'NEXO-SURFACE-002': {
    site_id: 'SITE-001',
    location_id: 'LOC-002',
    allowed_locations: ['LOC-001'],
    manipulated: true,
  },
  'NEXO-SURFACE-003': {
    product_id: 'PROD-001',
    canonical_unit: 'kg',
    presentation_valid: false,
    category_is_not_physical_contract: false,
  },
  'NEXO-SURFACE-004': { balance: 2, requested: 5, implicit_conversion: true },
  'NEXO-SURFACE-005': {
    operation_id: 'MOV-001',
    quantity: 2,
    origin_sufficient: false,
    duplicate: true,
    transition_legal: false,
  },
  'NEXO-SURFACE-006': {
    location_id: 'LOC-002',
    authorized_location_id: 'LOC-001',
    device_location_id: 'LOC-003',
  },
  'NEXO-SURFACE-007': {
    authorized_actor: false,
    quantity: 4,
    from_state: 'REQUESTED',
    to_state: 'RECEIVED',
  },
  'NEXO-SURFACE-008': {
    pending: 10,
    received: 4,
    remaining_after: 6,
    closes_document: true,
  },
  'NEXO-SURFACE-009': {
    asset_id: 'ASSET-001',
    serialized_identity_preserved: false,
    location_preserved: true,
    collapsed_to_fungible: true,
  },
  'NEXO-SURFACE-010': {
    authorized: false,
    route_valid: true,
    site_valid: true,
    unit_policy_valid: true,
  },
  'NEXO-SURFACE-011': {
    contract_consumed: true,
    claimed_owner: 'supabase_schema',
  },
  'NEXO-SURFACE-012': {
    server_render: true,
    client_render: true,
    hydration_mismatch: true,
    interaction_ok: true,
    accessibility_ok: false,
    print_preview_ok: true,
  },
});

const positiveProfiles = Object.freeze({
  '@vento/contracts': {
    types_compile: true,
    schemas_checked: true,
    serialization_checked: true,
    identifier_semantics_preserved: true,
    no_global_cast_bypass: true,
  },
  '@vento/os-context': {
    session_checked: true,
    operational_context_checked: true,
    permission_allow_checked: true,
    permission_deny_checked: true,
    client_cannot_elevate_authority: true,
  },
  '@vento/supabase': {
    browser_client_checked: true,
    server_client_checked: true,
    deny_path_checked: true,
    isolated_schema_source: true,
    no_service_role_fixture: true,
  },
  '@vento/ui-web': {
    server_render_checked: true,
    client_render_checked: true,
    hydration_checked: true,
    accessibility_checked: true,
    print_preview_checked: true,
  },
});

for (const surface of SURFACES) {
  test(`POS ${surface.id} ${surface.name}`, () => {
    assert.equal(evaluateSurface(surface.id, positiveSurfaceScenarios[surface.id]), true);
  });
}

for (const surface of SURFACES) {
  test(`NEG ${surface.id} ${surface.name} falla cerrado`, () => {
    assert.equal(evaluateSurface(surface.id, negativeSurfaceScenarios[surface.id]), false);
  });
}

for (const packageName of CANONICAL_PACKAGES) {
  test(`PROFILE POS ${packageName}`, () => {
    assert.equal(evaluateProfile(packageName, positiveProfiles[packageName]), true);
  });
}

for (const packageName of CANONICAL_PACKAGES) {
  test(`PROFILE NEG ${packageName} no acepta cobertura incompleta`, () => {
    const incomplete = { ...positiveProfiles[packageName] };
    const firstKey = Object.keys(incomplete)[0];
    incomplete[firstKey] = false;
    assert.equal(evaluateProfile(packageName, incomplete), false);
  });
}

function validEvidence() {
  const targetPackageSet = [...CANONICAL_PACKAGES];
  const identity = sha256Identity('fixture');
  return {
    consumer_repository: CONSUMER_REPOSITORY,
    consumer_branch: 'main',
    consumer_base_commit: '1'.repeat(40),
    consumer_manifest_identity: identity,
    consumer_lockfile_identity: identity,
    test_contract_identity: identity,
    test_suite_identity: identity,
    fixture_set_identity: identity,
    environment_identity: 'isolated:win32:x64:node:v24.19.0',
    runtime_identity: 'v24.19.0',
    framework_identity: 'node:test+ci007-policy-engine-v1',
    target_package_set: targetPackageSet,
    compatibility_refs: targetPackageSet.map(
      (packageName) => NEXO_RELATIONS[packageName].compatibility_ref,
    ),
    nexo_profile_set: targetPackageSet.map(
      (packageName) => NEXO_RELATIONS[packageName].profile,
    ),
    execution_identity: identity,
    started_at: '2026-08-17T21:35:00-05:00',
    completed_at: '2026-08-17T21:36:00-05:00',
    result: 'PASS',
    invalidation_reason: null,
    test_summary: {
      executed: 40,
      passed: 40,
      failed: 0,
      skipped: 0,
      denied_paths: 16,
    },
  };
}

test('REG-01 evidencia válida tiene los 19 campos contractuales', () => {
  const evidence = validEvidence();
  for (const field of REQUIRED_EVIDENCE_FIELDS) assert.ok(field in evidence);
  assert.deepEqual(validateEvidence(evidence), []);
});

test('REG-02 cero tests jamás se normaliza a PASS', () => {
  const evidence = validEvidence();
  evidence.test_summary.executed = 0;
  assert.ok(validateEvidence(evidence).includes('ZERO_REQUIRED_TESTS'));
});

test('REG-03 evidencia de otro consumidor jamás satisface NEXO', () => {
  const evidence = validEvidence();
  evidence.consumer_repository = 'vento-group-sas/vento-fogo';
  assert.ok(validateEvidence(evidence).includes('WRONG_CONSUMER_REPOSITORY'));
});

test('REG-04 cambiar commit vuelve STALE la evidencia', () => {
  const previous = validEvidence();
  const current = { ...previous, consumer_base_commit: '2'.repeat(40) };
  assert.equal(evidenceIsStale(previous, current), true);
});

test('REG-05 cambiar target package set vuelve STALE la evidencia', () => {
  const previous = validEvidence();
  const current = {
    ...previous,
    target_package_set: ['@vento/contracts'],
    compatibility_refs: ['PKG-COMP-MX-003'],
    nexo_profile_set: ['NEXO-PROFILE-CONTRACTS'],
  };
  assert.equal(evidenceIsStale(previous, current), true);
});

test('REG-06 entorno productivo queda bloqueado', () => {
  const evidence = validEvidence();
  evidence.environment_identity = 'production:remote';
  assert.ok(validateEvidence(evidence).includes('PRODUCTION_ENVIRONMENT_FORBIDDEN'));
});

test('REG-07 secretos reales o con forma de secreto quedan bloqueados', () => {
  assert.equal(containsSensitiveData({ token: 'ghp_abcdefghijklmnopqrstuvwxyz123456' }), true);
});

test('REG-08 conjunto multi-package conserva orden canónico y perfiles exactos', () => {
  assert.deepEqual(
    resolveTargetPackages('@vento/ui-web,@vento/contracts,@vento/supabase'),
    ['@vento/contracts', '@vento/supabase', '@vento/ui-web'],
  );
});