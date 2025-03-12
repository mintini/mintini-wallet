interface Pool {
  pool_id: string;
  pool_label: string;
  pledge: string;
  cost_per_block: string;
  delegations_count: number;
  delegations_amount: number;
  margin_ratio_per_thousand: string;
  margin_ratio: string;
}

export function getStakingPoolRating(pool: Pool) {
  const costPerBlock = parseFloat(pool.cost_per_block);
  const marginRatioPerThousand = parseFloat(pool.margin_ratio_per_thousand);

  let score = 0;

  if (costPerBlock <= 30) score += 50;
  else if (costPerBlock <= 60) score += 40;
  else if (costPerBlock <= 90) score += 30;
  else if (costPerBlock <= 120) score += 20;
  else score += 10;

  if (marginRatioPerThousand <= 20) score += 50;
  else if (marginRatioPerThousand <= 40) score += 40;
  else if (marginRatioPerThousand <= 60) score += 30;
  else if (marginRatioPerThousand <= 80) score += 20;
  else score += 10;

  if (score >= 100) return "Excellent";
  else if (score >= 90) return "Good";
  else if (score >= 80) return "Fair";
  else if (score >= 50) return "Poor";
  else return "No reward";
}
