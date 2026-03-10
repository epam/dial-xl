table Casualties
  dim [WINS Claim Number], \
  [WINS Claim Number for Count], \
  [WINS Claimant Number for Count], \
  [Line of Business], \
  [Date of Loss], \
  [TPA Claim Number], \
  [Claimant Name], \
  [TPA Name], \
  [Business Segment Code], \
  [Business Segment], \
  [Claim Reported Date], \
  [Claim Closed Date], \
  [Claim Status], \
  [Policy Number], \
  [PolicyNumEff], \
  [PolicyNumEffCov], \
  [Policy Effective Date], \
  [Policy Expiration Date], \
  [Claim Opened Date], \
  [Loss Description], \
  [Loss State], \
  [Type of Loss], \
  [Cause of Loss], \
  [CATASTROPHE Code], \
  [CATASTROPHE Effective Date], \
  [CATASTROPHE End Date], \
  [Insured Name], \
  [O/S_Indemnity], \
  [O/S_Medical], \
  [O/S_Loss], \
  [O/S_ALAE], \
  [O/S_ULAE], \
  [Total_O/S_Reserve], \
  [WINS_PAID_LOSS], \
  [WINS_INDEMNITY_PAID], \
  [WINS_MEDICAL_PAID], \
  [WINS_ALAE_PAID], \
  [WINS_ULAE_PAID], \
  [WINS_INDEMNITY_RECOVERY], \
  [WINS_MEDICAL_RECOVERY], \
  [WINS_ALAE_RECOVERY], \
  [WINS_ULAE_RECOVERY], \
  [WINS_PAID_EXPENSES], \
  [WINS_TOTAL_PAID], \
  [TOTAL_RECOVERIES], \
  [WINS_TOTAL_GROSS_INCURRED], \
  [WINS_TOTAL_NET_INCURRED], \
  [INDEMNITY_GROSS], \
  [MEDICAL_GROSS], \
  [ALAE_GROSS], \
  [ULAE_GROSS], \
  [Gross_Paid], \
  [TotalPaidxULAE], \
  [xULAETotalReserve], \
  [Producer Name], \
  [Underwriter Name], \
  [Industry Division], \
  [Industry Segment], \
  [NAICS 2012 Code], \
  [NAICS Description], \
  [Policy Limit], \
  [Policy Attachment Point], \
  [Policy Deductible Amount], \
  [Gross Written Premium], \
  [CATASTROPHE Description], \
  [Claimant Birthdate], \
  [Jurisdiction State], \
  [Body Part Description], \
  [Nature of Injury Description] = INPUT("files/{{ bucket }}/test-resources/81d%20casualty_data_loss_dt_2019-2023.csv")[[WINS Claim Number], \
  [WINS Claim Number for Count], \
  [WINS Claimant Number for Count], \
  [Line of Business], \
  [Date of Loss], \
  [TPA Claim Number], \
  [Claimant Name], \
  [TPA Name], \
  [Business Segment Code], \
  [Business Segment], \
  [Claim Reported Date], \
  [Claim Closed Date], \
  [Claim Status], \
  [Policy Number], \
  [PolicyNumEff], \
  [PolicyNumEffCov], \
  [Policy Effective Date], \
  [Policy Expiration Date], \
  [Claim Opened Date], \
  [Loss Description], \
  [Loss State], \
  [Type of Loss], \
  [Cause of Loss], \
  [CATASTROPHE Code], \
  [CATASTROPHE Effective Date], \
  [CATASTROPHE End Date], \
  [Insured Name], \
  [O/S_Indemnity], \
  [O/S_Medical], \
  [O/S_Loss], \
  [O/S_ALAE], \
  [O/S_ULAE], \
  [Total_O/S_Reserve], \
  [WINS_PAID_LOSS], \
  [WINS_INDEMNITY_PAID], \
  [WINS_MEDICAL_PAID], \
  [WINS_ALAE_PAID], \
  [WINS_ULAE_PAID], \
  [WINS_INDEMNITY_RECOVERY], \
  [WINS_MEDICAL_RECOVERY], \
  [WINS_ALAE_RECOVERY], \
  [WINS_ULAE_RECOVERY], \
  [WINS_PAID_EXPENSES], \
  [WINS_TOTAL_PAID], \
  [TOTAL_RECOVERIES], \
  [WINS_TOTAL_GROSS_INCURRED], \
  [WINS_TOTAL_NET_INCURRED], \
  [INDEMNITY_GROSS], \
  [MEDICAL_GROSS], \
  [ALAE_GROSS], \
  [ULAE_GROSS], \
  [Gross_Paid], \
  [TotalPaidxULAE], \
  [xULAETotalReserve], \
  [Producer Name], \
  [Underwriter Name], \
  [Industry Division], \
  [Industry Segment], \
  [NAICS 2012 Code], \
  [NAICS Description], \
  [Policy Limit], \
  [Policy Attachment Point], \
  [Policy Deductible Amount], \
  [Gross Written Premium], \
  [CATASTROPHE Description], \
  [Claimant Birthdate], \
  [Jurisdiction State], \
  [Body Part Description], \
  [Nature of Injury Description]]