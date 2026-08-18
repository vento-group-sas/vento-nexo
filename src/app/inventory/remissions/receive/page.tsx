import Link from "next/link";

import { createClient } from "@/lib/supabase/server";

import { confirmShipmentReceipt } from "./actions";

export const dynamic = "force-dynamic";

type Relation<T> = T | T[] | null;

type SiteRelation = {
  name: string | null;
};

type ProductRelation = {
  name: string | null;
};

type ShipmentItemRow = {
  id: string;
  base_qty: number | string | null;
  stock_unit_code: string | null;
  products: Relation<ProductRelation>;
};

type ShipmentRow = {
  id: string;
  shipment_code: string | null;
  origin: Relation<SiteRelation>;
  destination: Relation<SiteRelation>;
  remission_shipment_items: ShipmentItemRow[] | null;
};

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function ReceiveShipmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("remission_shipments")
    .select(
      "id,shipment_code,origin:sites!remission_shipments_origin_site_id_fkey(name),destination:sites!remission_shipments_destination_site_id_fkey(name),remission_shipment_items(id,base_qty,stock_unit_code,products(name))"
    )
    .eq("status", "in_transit")
    .order("departed_at");

  if (error) throw new Error(error.message);

  const shipments = (data ?? []) as unknown as ShipmentRow[];

  return (
    <div className="ui-scene w-full space-y-6">
      <section className="ui-panel ui-panel--halo">
        <div className="ui-caption">Recepción · logística</div>
        <h1 className="mt-2 ui-h1">Envíos por recibir</h1>
        <p className="mt-2 ui-body-muted">
          Escribe lo que llegó físicamente. Si falta algo, el sistema deja la novedad abierta automáticamente.
        </p>
      </section>

      {sp.error ? (
        <div className="ui-alert ui-alert--error">{decodeURIComponent(sp.error)}</div>
      ) : null}
      {sp.ok ? <div className="ui-alert ui-alert--success">Recepción confirmada.</div> : null}

      {shipments.map((shipment) => {
        const origin = firstRelation(shipment.origin);
        const destination = firstRelation(shipment.destination);

        return (
          <form
            key={shipment.id}
            action={confirmShipmentReceipt}
            className="ui-panel ui-remission-section space-y-3"
          >
            <input type="hidden" name="shipment_id" value={shipment.id} />
            <div className="font-semibold">
              {shipment.shipment_code || "Envío"} · {origin?.name || "Origen"} → {destination?.name || "Destino"}
            </div>

            {(shipment.remission_shipment_items ?? []).map((item) => {
              const product = firstRelation(item.products);
              const shippedQty = item.base_qty;

              return (
                <label key={item.id} className="flex items-center justify-between gap-3">
                  <span>
                    {product?.name || "Producto"} · despachado {shippedQty} {item.stock_unit_code || "un"}
                  </span>
                  <>
                    <input type="hidden" name="shipment_item_id" value={item.id} />
                    <input
                      className="ui-input w-28"
                      name="received_base_qty"
                      type="number"
                      min="0"
                      max={shippedQty ?? undefined}
                      step="0.001"
                      defaultValue={shippedQty ?? undefined}
                    />
                  </>
                </label>
              );
            })}

            <textarea
              className="ui-input min-h-20"
              name="notes"
              placeholder="Notas de recepción (opcional)"
            />
            <button className="ui-btn ui-btn--brand">Confirmar recepción</button>
          </form>
        );
      })}

      {!shipments.length ? (
        <div className="ui-empty">No hay envíos en tránsito para recibir.</div>
      ) : null}

      <Link href="/inventory/remissions" className="ui-btn ui-btn--ghost">
        Volver a remisiones
      </Link>
    </div>
  );
}