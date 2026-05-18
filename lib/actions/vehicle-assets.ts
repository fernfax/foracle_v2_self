"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAndFamily } from "@/lib/auth-context";
import {
  createVehicleAsset as createVehicleAssetService,
  deleteVehicleAsset as deleteVehicleAssetService,
  listVehicleAssets,
  updateVehicleAsset as updateVehicleAssetService,
} from "@/lib/services/vehicle-assets";

/**
 * Create a new vehicle asset
 */
export async function createVehicleAsset(data: {
  vehicleName: string;
  purchaseDate: string;
  coeExpiryDate?: string;
  originalPurchasePrice: number;
  loanAmountTaken?: number;
  loanAmountRepaid?: number;
  monthlyLoanPayment?: number;
  addToExpenditures?: boolean;
  expenseName?: string;
}) {
  const ctx = await getCurrentUserAndFamily();
  const result = await createVehicleAssetService(ctx, {
    vehicleName: data.vehicleName,
    purchaseDate: data.purchaseDate,
    coeExpiryDate: data.coeExpiryDate,
    originalPurchasePrice: data.originalPurchasePrice.toString(),
    loanAmountTaken: data.loanAmountTaken?.toString(),
    loanAmountRepaid: data.loanAmountRepaid?.toString(),
    monthlyLoanPayment: data.monthlyLoanPayment?.toString(),
    addToExpenditures: data.addToExpenditures,
    expenseName: data.expenseName,
  });
  revalidatePath("/assets");
  revalidatePath("/expenses");
  return result.row;
}

/**
 * Get all vehicle assets for the current user
 */
export async function getVehicleAssets() {
  const ctx = await getCurrentUserAndFamily();
  return listVehicleAssets(ctx);
}

/**
 * Update an existing vehicle asset
 */
export async function updateVehicleAsset(
  id: string,
  data: {
    vehicleName: string;
    purchaseDate: string;
    coeExpiryDate?: string;
    originalPurchasePrice: number;
    loanAmountTaken?: number;
    loanAmountRepaid?: number;
    monthlyLoanPayment?: number;
    addToExpenditures?: boolean;
    expenseName?: string;
  }
) {
  const ctx = await getCurrentUserAndFamily();
  const row = await updateVehicleAssetService(ctx, id, {
    vehicleName: data.vehicleName,
    purchaseDate: data.purchaseDate,
    coeExpiryDate: data.coeExpiryDate ?? null,
    originalPurchasePrice: data.originalPurchasePrice.toString(),
    loanAmountTaken: data.loanAmountTaken?.toString() ?? null,
    loanAmountRepaid: data.loanAmountRepaid?.toString() ?? null,
    monthlyLoanPayment: data.monthlyLoanPayment?.toString() ?? null,
    addToExpenditures: data.addToExpenditures,
    expenseName: data.expenseName,
  });
  revalidatePath("/assets");
  revalidatePath("/expenses");
  return row;
}

/**
 * Delete a vehicle asset
 */
export async function deleteVehicleAsset(id: string) {
  const ctx = await getCurrentUserAndFamily();
  await deleteVehicleAssetService(ctx, id);
  revalidatePath("/assets");
  revalidatePath("/expenses");
}
