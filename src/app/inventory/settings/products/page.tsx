import { requireAppAccess } from "@/lib/auth/guard";
import { MasterProductsConfigurator } from "@/features/inventory/master-products/master-products-configurator";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null;

type EmployeeRow = {
    role: string | null;
};

type ProductRow = {
    id: string;
    name: string;
    sku: string | null;
    is_active: boolean | null;
    stock_unit_code: string | null;
    category_id: string;
};

type CategoryRow = {
    id: string;
    name: string;
};

type SupplierRow = {
    id: string;
    name: string;
};

type SupplierNameRow = {
    name: string | null;
};

type PrimarySupplierLinkRow = {
    product_id: string;
    suppliers: Relation<SupplierNameRow>;
};

type RequestPolicyRow = {
    id: string;
    product_id: string;
    label: string;
    request_unit_code: string;
    base_unit_code: string;
    base_qty_per_request_unit: number;
    minimum_request_qty: number;
    request_step_qty: number;
    is_default: boolean | null;
};

type FulfillmentRouteRow = {
    product_id: string;
};

type UomProfileRow = {
    id: string;
    product_id: string;
    label: string;
    input_unit_code: string | null;
    qty_in_stock_unit: number | null;
    is_active: boolean | null;
};

type SupplierOfferRow = {
    id?: string | null;
    product_id: string;
    uom_profile_id: string | null;
    purchase_unit: string | null;
    purchase_pack_qty: number | null;
    purchase_pack_unit_code: string | null;
    purchase_price: number | null;
    currency: string | null;
    is_primary: boolean | null;
    suppliers: Relation<SupplierNameRow>;
};

type SiteRow = {
    id: string;
    name: string;
};

type ProductSiteSettingRow = {
    product_id: string;
    site_id: string;
    is_active: boolean | null;
    inventory_enabled: boolean | null;
    remission_enabled: boolean | null;
    sales_enabled: boolean | null;
    min_stock_qty: number | null;
};

type InventoryProfileRow = {
    product_id: string;
    track_inventory: boolean | null;
    inventory_kind: string | null;
    lot_tracking: boolean | null;
    expiry_tracking: boolean | null;
    measurement_mode: string | null;
    default_tolerance_percent: number | null;
};

type AreaKindRow = {
    code: string;
    name: string;
};

type LocationRow = {
    id: string;
    site_id: string;
    name: string;
};

type ConfigurationBatchRow = {
    id: string;
    zone: string;
    product_count: number;
    created_at: string;
};

function firstRelation<T>(value: Relation<T> | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

export default async function MasterProductsPage() {
    const { supabase, user } = await requireAppAccess({
        appId: "nexo",
        returnTo: "/inventory/settings/products",
        permissionCode: "inventory.stock",
    });

    const [
        employee,
        products,
        categories,
        suppliers,
        links,
        policies,
        routes,
        profiles,
        offers,
        sites,
        siteSettings,
        inventoryProfiles,
        areas,
        locations,
        batches,
    ] = await Promise.all([
        supabase.from("employees").select("role").eq("id", user.id).maybeSingle(),
        supabase
            .from("products")
            .select("id,name,sku,is_active,stock_unit_code,category_id")
            .order("name")
            .limit(1000),
        supabase.from("product_categories").select("id,name").eq("is_active", true).order("name"),
        supabase.from("suppliers").select("id,name").eq("is_active", true),
        supabase.from("product_suppliers").select("product_id,suppliers(name)").eq("is_primary", true),
        supabase
            .from("product_request_policies")
            .select(
                "id,product_id,label,request_unit_code,base_unit_code,base_qty_per_request_unit,minimum_request_qty,request_step_qty,is_default",
            )
            .eq("is_active", true)
            .order("is_default", { ascending: false }),
        supabase.from("product_fulfillment_routes").select("product_id").eq("is_active", true),
        supabase
            .from("product_uom_profiles")
            .select("id,product_id,label,input_unit_code,qty_in_stock_unit,is_active")
            .order("label"),
        supabase
            .from("product_suppliers")
            .select(
                "product_id,uom_profile_id,purchase_unit,purchase_pack_qty,purchase_pack_unit_code,purchase_price,currency,is_primary,suppliers(name)",
            ),
        supabase.from("sites").select("id,name").eq("is_active", true).order("name"),
        supabase
            .from("product_site_settings")
            .select("product_id,site_id,is_active,inventory_enabled,remission_enabled,sales_enabled,min_stock_qty"),
        supabase
            .from("product_inventory_profiles")
            .select(
                "product_id,track_inventory,inventory_kind,lot_tracking,expiry_tracking,measurement_mode,default_tolerance_percent",
            ),
        supabase.from("area_kinds").select("code,name").order("name"),
        supabase.from("inventory_locations").select("id,site_id,name").eq("is_active", true).order("name"),
        supabase
            .from("product_configuration_batches")
            .select("id,zone,product_count,created_at")
            .order("created_at", { ascending: false })
            .limit(12),
    ]);

    const employeeRow = employee.data as unknown as EmployeeRow | null;
    const productRows = (products.data ?? []) as unknown as ProductRow[];
    const categoryRows = (categories.data ?? []) as unknown as CategoryRow[];
    const supplierRows = (suppliers.data ?? []) as unknown as SupplierRow[];
    const linkRows = (links.data ?? []) as unknown as PrimarySupplierLinkRow[];
    const policyRows = (policies.data ?? []) as unknown as RequestPolicyRow[];
    const routeRows = (routes.data ?? []) as unknown as FulfillmentRouteRow[];
    const profileRows = (profiles.data ?? []) as unknown as UomProfileRow[];
    const offerRows = (offers.data ?? []) as unknown as SupplierOfferRow[];
    const siteRows = (sites.data ?? []) as unknown as SiteRow[];
    const siteSettingRows = (siteSettings.data ?? []) as unknown as ProductSiteSettingRow[];
    const inventoryProfileSourceRows = (inventoryProfiles.data ?? []) as unknown as InventoryProfileRow[];
    const areaRows = (areas.data ?? []) as unknown as AreaKindRow[];
    const locationRows = (locations.data ?? []) as unknown as LocationRow[];
    const batchRows = (batches.data ?? []) as unknown as ConfigurationBatchRow[];

    void supplierRows;

    const categoryMap = new Map(categoryRows.map((row) => [row.id, row.name]));
    const supplierMap = new Map(
        linkRows.map((row) => [row.product_id, firstRelation(row.suppliers)?.name ?? null]),
    );
    const policyIds = new Set(policyRows.map((row) => row.product_id));
    const routeIds = new Set(routeRows.map((row) => row.product_id));
    const policyByProduct = new Map(policyRows.map((row) => [row.product_id, row]));

    const rows = productRows.map((row) => ({
        id: row.id,
        name: row.name ?? "Sin nombre",
        sku: row.sku,
        isActive: Boolean(row.is_active),
        categoryId: row.category_id,
        category: categoryMap.get(row.category_id) ?? null,
        supplier: supplierMap.get(row.id) ?? null,
        stockUnit: row.stock_unit_code,
        hasPolicy: policyIds.has(row.id),
        hasRoute: routeIds.has(row.id),
        requestPolicy: policyByProduct.get(row.id) ?? null,
    }));

    const productName = new Map(rows.map((row) => [row.id, row.name]));
    const profileOffer = new Map(
        offerRows
            .filter((row) => Boolean(row.uom_profile_id))
            .map((row) => [row.uom_profile_id as string, row]),
    );

    const presentations = profileRows.map((row) => {
        const offer = profileOffer.get(row.id);
        const supplier = firstRelation(offer?.suppliers);

        return {
            id: row.id,
            productId: row.product_id,
            productName: productName.get(row.product_id) ?? "Producto no disponible",
            label: row.label,
            inputUnit: row.input_unit_code,
            stockQty: row.qty_in_stock_unit,
            stockUnit: rows.find((product) => product.id === row.product_id)?.stockUnit ?? null,
            isActive: Boolean(row.is_active),
            supplierLinkId: offer?.id ?? null,
            supplier: offer ? supplier?.name ?? null : null,
            purchaseUnit: offer?.purchase_pack_unit_code ?? offer?.purchase_unit ?? null,
            purchasePackQty: offer?.purchase_pack_qty ?? null,
            purchasePrice: offer?.purchase_price ?? null,
            currency: offer?.currency ?? "COP",
            isPrimary: Boolean(offer?.is_primary),
        };
    });

    const siteSettingsRows = siteSettingRows.map((row) => ({
        productId: row.product_id,
        siteId: row.site_id,
        isActive: Boolean(row.is_active),
        inventoryEnabled: row.inventory_enabled !== false,
        remissionEnabled: Boolean(row.remission_enabled),
        salesEnabled: Boolean(row.sales_enabled),
        minStockQty: Number(row.min_stock_qty ?? 0),
    }));

    const inventoryProfileRows = inventoryProfileSourceRows.map((row) => ({
        productId: row.product_id,
        trackInventory: row.track_inventory !== false,
        inventoryKind: row.inventory_kind ?? "unclassified",
        lotTracking: Boolean(row.lot_tracking),
        expiryTracking: Boolean(row.expiry_tracking),
        measurementMode: row.measurement_mode ?? "fixed_presentation",
        defaultTolerancePercent: Number(row.default_tolerance_percent ?? 0),
    }));

    const canApply = ["propietario", "gerente_general"].includes(
        String(employeeRow?.role ?? "").toLowerCase(),
    );

    const supplierNames = Array.from(
        new Set(
            rows
                .map((row) => row.supplier)
                .filter((supplier): supplier is string => Boolean(supplier)),
        ),
    );

    return (
        <MasterProductsConfigurator
            canApply={canApply}
            rows={rows}
            categories={categoryRows.map((row) => ({ id: row.id, name: row.name }))}
            suppliers={supplierNames}
            presentations={presentations}
            sites={siteRows.map((row) => ({ id: row.id, name: row.name }))}
            siteSettings={siteSettingsRows}
            inventoryProfiles={inventoryProfileRows}
            areas={areaRows.map((row) => ({ code: row.code, name: row.name }))}
            locations={locationRows.map((row) => ({
                id: row.id,
                siteId: row.site_id,
                name: row.name,
            }))}
            batches={batchRows.map((row) => ({
                id: row.id,
                zone: row.zone,
                productCount: row.product_count,
                createdAt: row.created_at,
            }))}
        />
    );
}