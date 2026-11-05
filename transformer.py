from math import sqrt


def ua_percent(Rt, Str, Un):
    """ua% из Rt = ua% * Un^2 / (100 * Str)
    =>  ua% = 100 * Rt * Str / Un^2
    Rt  - активное сопротивление трансформатора [Ом]
    Str - номинальная мощность [ВА]
    Un  - номинальное напряжение [В]  (единицы должны совпадать: ВА и В, или МВА и кВ)
    """
    return 100 * Rt * Str / Un**2


def Rt_from_ua(ua, Str, Un):
    """Rt = ua% * Un^2 / (100 * Str)"""
    return ua * Un**2 / (100 * Str)


def ur_percent(usc, ua):
    """ur% = sqrt(usc%^2 - ua%^2)"""
    return sqrt(usc**2 - ua**2)


def Xt_from_ur(ur, Str, Un):
    """Xt = ur% * Un^2 / (100 * Str)"""
    return ur * Un**2 / (100 * Str)


if __name__ == "__main__":
    # пример: Rt = 0.5 Ом, Str = 1 МВА, Un = 10 кВ
    Rt, Str, Un = 0.5, 1, 10
    ua = ua_percent(Rt, Str, Un)
    print("ua% =", ua)
    # Rt_from_ua(ua, Str, Un) вернёт обратно 0.5
    print("проверка Rt =", Rt_from_ua(ua, Str, Un))
