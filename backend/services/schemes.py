"""
Government scheme knowledge base and eligibility matcher.
Contains curated data for PM SVANidhi, Mudra, PMEGP, and other MSME schemes.
"""

from typing import Optional

# Curated scheme database
SCHEMES_DB = [
    {
        "id": "pm_svanidhi",
        "name": "PM SVANidhi",
        "full_name": "PM Street Vendor's AtmaNirbhar Nidhi",
        "category": "Credit",
        "max_loan": 50000,
        "interest_rate": "7% (with subsidy)",
        "description": "Collateral-free working capital loan for street vendors displaced by COVID-19.",
        "eligibility": {
            "business_type": ["street vendor", "hawker", "footpath vendor"],
            "min_annual_revenue": None,
            "max_annual_revenue": None,
            "collateral_required": False,
            "bank_account_required": True,
            "documents": ["Aadhaar", "Vending Certificate or Letter of Recommendation from ULB"],
        },
        "apply_url": "https://pmsvanidhi.mohua.gov.in",
        "hindi_description": "सड़क विक्रेताओं के लिए बिना गारंटी का ₹50,000 तक का ऋण।",
    },
    {
        "id": "mudra_shishu",
        "name": "Mudra Loan - Shishu",
        "full_name": "PMMY Mudra Shishu (Up to ₹50,000)",
        "category": "Credit",
        "max_loan": 50000,
        "interest_rate": "10-12%",
        "description": "Micro-enterprise loan for businesses needing up to ₹50,000 in working capital.",
        "eligibility": {
            "business_type": ["any micro business", "artisan", "vendor", "shop", "manufacturing"],
            "min_annual_revenue": None,
            "max_annual_revenue": 500000,
            "collateral_required": False,
            "bank_account_required": True,
            "documents": ["Aadhaar", "PAN", "Bank Statements", "Business Proof"],
        },
        "apply_url": "https://www.mudra.org.in",
        "hindi_description": "₹50,000 तक के सूक्ष्म उद्यम ऋण के लिए।",
    },
    {
        "id": "mudra_kishore",
        "name": "Mudra Loan - Kishore",
        "full_name": "PMMY Mudra Kishore (₹50,000 - ₹5 Lakh)",
        "category": "Credit",
        "max_loan": 500000,
        "interest_rate": "10-14%",
        "description": "Loan for established micro businesses for expansion, equipment, or working capital.",
        "eligibility": {
            "business_type": ["any micro business", "artisan", "manufacturer", "trader"],
            "min_annual_revenue": 100000,
            "max_annual_revenue": 2500000,
            "collateral_required": False,
            "bank_account_required": True,
            "documents": ["Aadhaar", "PAN", "6-month Bank Statements", "GST if applicable"],
        },
        "apply_url": "https://www.mudra.org.in",
        "hindi_description": "₹5 लाख तक के व्यवसाय विस्तार ऋण के लिए।",
    },
    {
        "id": "pmegp",
        "name": "PMEGP",
        "full_name": "Prime Minister's Employment Generation Programme",
        "category": "Subsidy + Credit",
        "max_loan": 2500000,
        "interest_rate": "Standard bank rates",
        "description": "Subsidy of 15-35% on project cost for new enterprises in manufacturing or service sector.",
        "eligibility": {
            "business_type": ["manufacturing", "service", "artisan", "food processing"],
            "min_annual_revenue": None,
            "max_annual_revenue": None,
            "collateral_required": True,
            "bank_account_required": True,
            "min_age": 18,
            "documents": ["Aadhaar", "PAN", "Project Report", "Caste Certificate (if applicable)"],
        },
        "apply_url": "https://www.kviconline.gov.in/pmegpeportal",
        "hindi_description": "नए उद्यम के लिए 15-35% सब्सिडी और ₹25 लाख तक का ऋण।",
    },
    {
        "id": "e_shram",
        "name": "e-Shram Card",
        "full_name": "e-Shram - National Database of Unorganised Workers",
        "category": "Social Security",
        "max_loan": None,
        "interest_rate": None,
        "description": "Registration for unorganized workers providing access to accident insurance, social security schemes.",
        "eligibility": {
            "business_type": ["any unorganized worker", "street vendor", "artisan", "farmer"],
            "min_annual_revenue": None,
            "max_annual_revenue": None,
            "collateral_required": False,
            "bank_account_required": False,
            "documents": ["Aadhaar", "Mobile number linked to Aadhaar"],
        },
        "apply_url": "https://eshram.gov.in",
        "hindi_description": "₹2 लाख दुर्घटना बीमा और सरकारी योजनाओं तक पहुंच के लिए पंजीकरण।",
    },
    {
        "id": "stand_up_india",
        "name": "Stand-Up India",
        "full_name": "Stand-Up India Scheme",
        "category": "Credit",
        "max_loan": 10000000,
        "interest_rate": "Base rate + 3%",
        "description": "Bank loans from ₹10 lakh to ₹1 crore for SC/ST and women entrepreneurs.",
        "eligibility": {
            "business_type": ["manufacturing", "service", "trading"],
            "min_annual_revenue": None,
            "max_annual_revenue": None,
            "collateral_required": True,
            "bank_account_required": True,
            "gender_preference": "female",
            "caste_preference": ["SC", "ST"],
            "documents": ["Aadhaar", "PAN", "Caste Certificate", "Project Report", "Bank Statements"],
        },
        "apply_url": "https://www.standupmitra.in",
        "hindi_description": "SC/ST और महिला उद्यमियों के लिए ₹10 लाख से ₹1 करोड़ तक का ऋण।",
    },
]


def match_schemes(profile: dict) -> list[dict]:
    """
    Match a merchant profile against available government schemes.
    Returns ranked list of eligible schemes with reasoning.
    """
    matched = []

    business_type = (profile.get("business_type") or "").lower()
    annual_revenue = profile.get("annual_revenue") or 0
    collateral = profile.get("collateral_available", False)
    has_bank_account = profile.get("has_bank_account", False)
    gender = (profile.get("gender") or "").lower()
    caste = (profile.get("caste_category") or "").upper()

    for scheme in SCHEMES_DB:
        eligibility = scheme["eligibility"]
        score = 0
        reasons = []

        # Check collateral requirement
        if eligibility.get("collateral_required") and not collateral:
            reasons.append("⚠️ Requires collateral (you indicated none)")
            score -= 10
        elif not eligibility.get("collateral_required"):
            reasons.append("✅ No collateral required")
            score += 20

        # Check bank account
        if eligibility.get("bank_account_required") and not has_bank_account:
            reasons.append("⚠️ Bank account required")
            score -= 5
        elif eligibility.get("bank_account_required") and has_bank_account:
            reasons.append("✅ Bank account available")
            score += 10

        # Check revenue range
        min_rev = eligibility.get("min_annual_revenue")
        max_rev = eligibility.get("max_annual_revenue")
        if min_rev and annual_revenue < min_rev:
            reasons.append(f"⚠️ Minimum annual revenue ₹{min_rev:,} required")
            score -= 15
        if max_rev and annual_revenue > max_rev:
            reasons.append(f"⚠️ Annual revenue must be below ₹{max_rev:,}")
            score -= 15
        if not min_rev and not max_rev:
            score += 5

        # Gender preference bonus
        gender_pref = eligibility.get("gender_preference")
        if gender_pref and gender_pref in gender:
            reasons.append("✅ Eligible as a woman entrepreneur")
            score += 25

        # Caste preference
        caste_pref = eligibility.get("caste_preference", [])
        if caste_pref and caste in caste_pref:
            reasons.append(f"✅ Eligible under {caste} category reservation")
            score += 20

        # Business type match
        scheme_types = eligibility.get("business_type", [])
        for st in scheme_types:
            if st.lower() in business_type or business_type in st.lower() or st.lower() == "any micro business" or "any" in st.lower():
                reasons.append(f"✅ Your business type qualifies")
                score += 15
                break

        if score >= 0:
            matched.append({
                **scheme,
                "eligibility_score": score,
                "eligibility_reasons": reasons,
            })

    # Sort by score descending
    matched.sort(key=lambda x: x["eligibility_score"], reverse=True)
    return matched


INTERVIEW_QUESTIONS = [
    {
        "id": "business_type",
        "question_hi": "आपका व्यवसाय क्या है? जैसे कि सब्जी बेचना, कपड़े सिलना, चाय की दुकान, या कुछ और?",
        "question_en": "What is your business? For example, selling vegetables, tailoring, tea shop, or something else?",
        "field": "business_type",
    },
    {
        "id": "annual_revenue",
        "question_hi": "एक महीने में आप लगभग कितना कमाते हैं? अनुमान बताएं।",
        "question_en": "Approximately how much do you earn in a month? Give an estimate.",
        "field": "annual_revenue",
    },
    {
        "id": "location",
        "question_hi": "आप किस शहर या गांव में रहते हैं?",
        "question_en": "Which city or village do you live in?",
        "field": "location",
    },
    {
        "id": "has_bank_account",
        "question_hi": "क्या आपके पास बैंक खाता है?",
        "question_en": "Do you have a bank account?",
        "field": "has_bank_account",
    },
    {
        "id": "collateral",
        "question_hi": "क्या आपके पास कोई संपत्ति है जिसे आप गारंटी के रूप में दे सकते हैं, जैसे जमीन या मकान?",
        "question_en": "Do you own any property that can be used as collateral, like land or a house?",
        "field": "collateral_available",
    },
    {
        "id": "gender",
        "question_hi": "आप पुरुष हैं या महिला?",
        "question_en": "Are you male or female?",
        "field": "gender",
    },
]
