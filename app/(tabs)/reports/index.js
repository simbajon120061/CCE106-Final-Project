import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  Platform,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Card from "@/components/Card";
import Button from "@/components/Button";
import EmptyState from "@/components/EmptyState";
import TopHeader from "@/components/TopHeader";

import {
  colors,
  spacing,
  typography,
  radius,
} from "@/constants/theme";

import {
  formatCurrency,
  formatDate,
} from "@/lib/format";

import {
  clearHistory,
  deleteHistoryEntry,
  exportAllData,
  getDailySalesSummary,
  getLowStockProducts,
  getTransactionHistory,
  getUnpaidBalances,
} from "@/db/database";
import { useAuth } from "@/context/AuthContext";
import {
  createSpreadsheetCsv,
  saveSpreadsheetBackup,
} from "@/lib/spreadsheetBackup";

const BACKUP_SETTINGS_KEY = "track-and-tally:backup-settings:";

export default function ReportsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { user } = useAuth();

  const [tab, setTab] = useState("sales");

  // SALES FILTER
  const [salesPeriod, setSalesPeriod] = useState("daily");

  const [summary, setSummary] = useState([]);
  const [unpaid, setUnpaid] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [history, setHistory] = useState([]);

  const [historyTypeFilter, setHistoryTypeFilter] =
    useState("all");

  const [historyDateFilter, setHistoryDateFilter] =
    useState("all");
  const [printDateFilter, setPrintDateFilter] =
    useState("all");

  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSchedule, setBackupSchedule] = useState("12");
  const [customBackupHours, setCustomBackupHours] = useState("");
  const [backupScheduleLoading, setBackupScheduleLoading] = useState(true);
  const [lastAutoBackupAt, setLastAutoBackupAt] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [historyClearing, setHistoryClearing] = useState(false);

  const handleClearHistory = useCallback(() => {
    if (!user?.id || historyClearing) return;

    Alert.alert(
      "Clear all history?",
      "This permanently removes all sales and payment records for this store. Debtor profiles will not be removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            setHistoryClearing(true);
            try {
              await clearHistory(db, user.id);
              setHistory([]);
              setSummary([]);
              setUnpaid([]);
              setHistoryTypeFilter("all");
              setHistoryDateFilter("all");
            } catch (error) {
              console.error("Failed to clear history:", error);
              Alert.alert(
                "Could not clear history",
                error?.message || "Please try again."
              );
            } finally {
              setHistoryClearing(false);
            }
          },
        },
      ]
    );
  }, [db, historyClearing, user]);

  const handleDeleteHistoryEntry = useCallback((entry) => {
    if (!user?.id) return;

    Alert.alert(
      "Delete this record?",
      `Remove this ${entry.label.toLowerCase()} from history? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHistoryEntry(db, user.id, entry.id);
              const [summaryRows, unpaidRows, historyRows] = await Promise.all([
                getDailySalesSummary(db, user.id, 31),
                getUnpaidBalances(db, user.id),
                getTransactionHistory(db, user.id, 30),
              ]);
              setSummary(summaryRows || []);
              setUnpaid(unpaidRows || []);
              setHistory(historyRows || []);
            } catch (error) {
              console.error("Failed to delete history entry:", error);
              Alert.alert(
                "Could not delete record",
                error?.message || "Please try again."
              );
            }
          },
        },
      ]
    );
  }, [db, user]);

  /*
   * LOAD REPORT DATA
   *
   * 31 days are loaded so the Monthly filter
   * can display the last 30 days.
   */
  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        try {
          const [s, u, l, h] = await Promise.all([
            getDailySalesSummary(
              db,
              user?.id,
              31
            ),

            getUnpaidBalances(
              db,
              user?.id
            ),

            getLowStockProducts(
              db,
              user?.id
            ),

            getTransactionHistory(
              db,
              user?.id,
              30
            ),
          ]);

          if (!active) return;

          setSummary(s || []);
          setUnpaid(u || []);
          setLowStock(l || []);
          setHistory(h || []);
        } catch (error) {
          console.error(
            "Failed to load reports:",
            error
          );
        }
      }

      load();

      return () => {
        active = false;
      };
    }, [db, user])
  );

  /*
   * TOTAL UNPAID
   */
  const totalUnpaid = unpaid.reduce(
    (sum, d) =>
      sum + Number(d.balance || 0),
    0
  );

  /*
   * SALES PERIOD CONFIGURATION
   *
   * Daily   = 1 day
   * Weekly  = last 7 days
   * Monthly = last 30 days
   */
  const salesPeriodConfig = {
    daily: {
      label: "Today",
      subtitle: "Sales recorded today",
      days: 1,
    },

    weekly: {
      label: "Last 7 days",
      subtitle:
        "Sales recorded over the last 7 days",
      days: 7,
    },

    monthly: {
      label: "Last 30 days",
      subtitle:
        "Sales recorded over the last 30 days",
      days: 30,
    },
  };

  const selectedSalesConfig =
    salesPeriodConfig[salesPeriod] ||
    salesPeriodConfig.daily;

  /*
   * GET ROWS FOR SELECTED SALES PERIOD
   */
  const salesPeriodRows = useMemo(() => {
    return summary.slice(
      0,
      selectedSalesConfig.days
    );
  }, [
    summary,
    selectedSalesConfig.days,
  ]);

  /*
   * CALCULATE TOTALS FOR SELECTED PERIOD
   */
  const salesPeriodTotals = useMemo(() => {
    return salesPeriodRows.reduce(
      (totals, row) => {
        const cash = Number(
          row.cash_total || 0
        );

        const credit = Number(
          row.credit_total ??
            row.total_credit_sales ??
            0
        );

        const items = Number(
          row.item_count || 0
        );

        totals.cash += cash;
        totals.credit += credit;
        totals.items += items;

        return totals;
      },
      {
        cash: 0,
        credit: 0,
        items: 0,
      }
    );
  }, [salesPeriodRows]);

  /*
   * TODAY VALUES
   *
   * These are kept for the PDF/report output.
   */
  const now = new Date();
  const todayDateKey = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const today = summary.find((row) => row.date === todayDateKey);

  const todayCash = Number(
    today?.cash_total || 0
  );

  const todayCredit = Number(
    today?.credit_total ??
      today?.total_credit_sales ??
      0
  );

  const todayGrandTotal =
    todayCash + todayCredit;

  const todayItemsSold = Number(
    today?.item_count || 0
  );

  /*
   * SELECTED FILTER TOTALS
   */
  const selectedCash =
    salesPeriodTotals.cash;

  const selectedCredit =
    salesPeriodTotals.credit;

  const selectedGrandTotal =
    selectedCash + selectedCredit;

  const selectedItemsSold =
    salesPeriodTotals.items;

  /*
   * HISTORY DATE OPTIONS
   */
  const historyDates = useMemo(
    () => [
      ...new Set(
        history.map((entry) =>
          getHistoryDateKey(entry.date)
        )
      ),
    ],
    [history]
  );

  /*
   * FILTER HISTORY
   */
  const filteredHistory = useMemo(
    () =>
      history.filter((entry) => {
        const matchesType =
          historyTypeFilter === "all" ||
          entry.type === historyTypeFilter;

        const matchesDate =
          historyDateFilter === "all" ||
          getHistoryDateKey(entry.date) ===
            historyDateFilter;

        return (
          matchesType &&
          matchesDate
        );
      }),
    [
      history,
      historyDateFilter,
      historyTypeFilter,
    ]
  );

  const printHistory = useMemo(
    () =>
      printDateFilter === "all"
        ? history
        : history.filter(
            (entry) =>
              getHistoryDateKey(entry.date) ===
              printDateFilter
          ),
    [history, printDateFilter]
  );

  const printDateLabel =
    printDateFilter === "all"
      ? "All dates"
      : formatDate(printDateFilter);

  const backupIntervalHours = useMemo(() => {
    if (backupSchedule === "custom") {
      const hours = Number(customBackupHours);
      return Number.isFinite(hours) && hours >= 1 ? hours : null;
    }

    return Number(backupSchedule) || null;
  }, [backupSchedule, customBackupHours]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let current = true;

    AsyncStorage.getItem(`${BACKUP_SETTINGS_KEY}${user.id}`)
      .then((stored) => {
        if (!current) return;
        setBackupScheduleLoading(true);
        if (!stored || !current) return;
        const settings = JSON.parse(stored);
        setBackupSchedule(settings.schedule || "12");
        setCustomBackupHours(settings.customHours || "");
        setLastAutoBackupAt(settings.lastAutoBackupAt || null);
      })
      .catch((error) => {
        console.error("Could not load backup settings:", error);
      })
      .finally(() => {
        if (current) setBackupScheduleLoading(false);
      });

    return () => {
      current = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || backupScheduleLoading) return;

    AsyncStorage.setItem(
      `${BACKUP_SETTINGS_KEY}${user.id}`,
      JSON.stringify({
        schedule: backupSchedule,
        customHours: customBackupHours,
        lastAutoBackupAt,
      })
    ).catch((error) => {
      console.error("Could not save backup settings:", error);
    });
  }, [
    backupSchedule,
    backupScheduleLoading,
    customBackupHours,
    lastAutoBackupAt,
    user?.id,
  ]);

  useEffect(() => {
    if (
      Platform.OS === "web" ||
      !user?.id ||
      backupScheduleLoading ||
      !backupIntervalHours
    ) {
      return undefined;
    }

    let active = true;
    const intervalMs = backupIntervalHours * 60 * 60 * 1000;

    const createAutomaticBackup = async () => {
      const now = Date.now();
      if (lastAutoBackupAt && now - lastAutoBackupAt < intervalMs) return;

      try {
        const data = await exportAllData(db, user.id);
        await saveSpreadsheetBackup(data, "automatic");
        if (active) setLastAutoBackupAt(now);
      } catch (error) {
        console.error("Automatic spreadsheet backup failed:", error);
      }
    };

    createAutomaticBackup();
    const timer = setInterval(createAutomaticBackup, 60 * 60 * 1000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [
    backupIntervalHours,
    backupScheduleLoading,
    db,
    lastAutoBackupAt,
    user?.id,
  ]);

  /*
   * SPREADSHEET BACKUP
   */
  async function handleSaveSpreadsheetBackup() {
    setBackupLoading(true);

    try {
      if (!user?.id) {
        throw new Error("User is not logged in.");
      }

      const data = await exportAllData(db, user.id);

      if (Platform.OS === "web") {
        const blob = new Blob([createSpreadsheetCsv(data)], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "track-and-tally-backup.csv";
        link.click();
        URL.revokeObjectURL(url);
        Alert.alert(
          "Spreadsheet downloaded",
          "Upload the downloaded CSV file to Google Drive if you want a cloud copy."
        );
        return;
      }

      const uri = await saveSpreadsheetBackup(data, "manual");

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Spreadsheet saved",
          "Your CSV backup was saved locally."
        );
        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle: "Save spreadsheet backup",
        mimeType: "text/csv",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error) {
      console.error(
        "Failed to create spreadsheet backup:",
        error
      );

      Alert.alert(
        "Backup failed",
        error?.message || "Please try again."
      );
    } finally {
      setBackupLoading(false);
    }
  }

  /*
   * PRINT / PDF REPORT
   */
  async function printReports(
    saveAsPdf = false
  ) {
    setReportLoading(true);

    try {
      const reportHtml =
        buildReportsHtml({
          todayCash,
          todayCredit,
          todayGrandTotal,
          todayItemsSold,
          totalUnpaid,
          unpaid,
          lowStock,
          history: printHistory,
          historyDateLabel: printDateLabel,
        });

      if (Platform.OS === "web") {
        openWebPrintDialog(
          reportHtml
        );
        return;
      }

      if (!saveAsPdf) {
        await Print.printAsync({
          html: reportHtml,
        });

        return;
      }

      const { uri } =
        await Print.printToFileAsync({
          html: reportHtml,
        });

      const canShare =
        await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "PDF created",
          "This device cannot open a save sheet for the PDF."
        );

        return;
      }

      await Sharing.shareAsync(uri, {
        dialogTitle:
          "Save Track and Tally report",
        mimeType:
          "application/pdf",
        UTI: ".pdf",
      });
    } catch (error) {
      console.error(
        "Could not create report PDF:",
        error
      );

      Alert.alert(
        saveAsPdf
          ? "Could not save PDF"
          : "Could not print reports",
        getExportErrorMessage(
          error
        )
      );
    } finally {
      setReportLoading(false);
    }
  }

  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top"]}
    >
      <TopHeader
        title="Reports"
        subtitle="Sales, balances, history, and backup"
      />

      {/* TAB NAVIGATION */}
      <View style={styles.tabsOuter}>
        <View style={styles.tabs}>
          <TabButton
            icon="bar-chart-outline"
            label="Sales"
            active={tab === "sales"}
            onPress={() =>
              setTab("sales")
            }
          />

          <TabButton
            icon="wallet-outline"
            label="Unpaid"
            active={tab === "unpaid"}
            onPress={() =>
              setTab("unpaid")
            }
          />

          <TabButton
            icon="time-outline"
            label="History"
            active={tab === "history"}
            onPress={() =>
              setTab("history")
            }
          />

          <TabButton
            icon="cloud-outline"
            label="Backup"
            active={tab === "backup"}
            onPress={() =>
              setTab("backup")
            }
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={
          tab === "history" ? [1] : undefined
        }
        contentContainerStyle={
          styles.container
        }
      >
        {/* ================================================== */}
        {/* SALES */}
        {/* ================================================== */}

        {tab === "sales" && (
          <>
            <SectionHeader
              icon="stats-chart-outline"
              title={`${selectedSalesConfig.label} sales`}
              subtitle={
                selectedSalesConfig.subtitle
              }
            />

            {/* SALES PERIOD FILTER */}
            <Card
              style={
                styles.salesPeriodCard
              }
            >
              <View
                style={
                  styles.salesPeriodHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.salesPeriodTitle
                    }
                  >
                    Sales period
                  </Text>

                  <Text
                    style={
                      styles.salesPeriodSubtitle
                    }
                  >
                    Choose how you want to
                    view sales
                  </Text>
                </View>

                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.navy}
                />
              </View>

              <View
                style={
                  styles.salesPeriodButtons
                }
              >
                {[
                  {
                    label: "Daily",
                    value: "daily",
                    icon: "today-outline",
                  },

                  {
                    label: "Weekly",
                    value: "weekly",
                    icon: "calendar-outline",
                  },

                  {
                    label: "Monthly",
                    value: "monthly",
                    icon: "calendar-number-outline",
                  },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    style={({
                      pressed,
                    }) => [
                      styles.salesPeriodButton,

                      salesPeriod ===
                        option.value &&
                        styles.salesPeriodButtonActive,

                      pressed &&
                        styles.salesPeriodButtonPressed,
                    ]}
                    onPress={() =>
                      setSalesPeriod(
                        option.value
                      )
                    }
                  >
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={
                        salesPeriod ===
                        option.value
                          ? colors.white
                          : colors.navy
                      }
                    />

                    <Text
                      style={[
                        styles.salesPeriodButtonText,

                        salesPeriod ===
                          option.value &&
                          styles.salesPeriodButtonTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            {/* SALES METRICS */}
            <View
              style={styles.summaryGrid}
            >
              <MetricCard
                icon="cash-outline"
                label="Cash sales"
                value={formatCurrency(
                  selectedCash
                )}
                iconBackground="cream"
              />

              <MetricCard
                icon="wallet-outline"
                label="Utang sales"
                value={formatCurrency(
                  selectedCredit
                )}
                danger
                iconBackground="danger"
              />

              <MetricCard
                icon="trending-up-outline"
                label="Grand total"
                value={formatCurrency(
                  selectedGrandTotal
                )}
                success
                iconBackground="success"
              />

              <MetricCard
                icon="cube-outline"
                label="Items sold"
                value={String(
                  selectedItemsSold
                )}
                iconBackground="cream"
              />
            </View>

            {/* SALES BREAKDOWN */}
            <SectionHeader
              icon="calendar-outline"
              title={`${selectedSalesConfig.label} breakdown`}
              subtitle="Daily sales activity"
            />

            {salesPeriodRows.length ===
            0 ? (
              <EmptyState
                icon="bar-chart-outline"
                title="No sales recorded yet"
              />
            ) : (
              <Card
                style={styles.listCard}
              >
                {salesPeriodRows.map(
                  (row, i) => {
                    const cash =
                      Number(
                        row.cash_total ||
                          0
                      );

                    const credit =
                      Number(
                        row.credit_total ??
                          row.total_credit_sales ??
                          0
                      );

                    const total =
                      cash + credit;

                    const items =
                      Number(
                        row.item_count ||
                          0
                      );

                    return (
                      <View
                        key={`${row.date}-${i}`}
                        style={[
                          styles.dayRow,

                          i !==
                            salesPeriodRows.length -
                              1 &&
                            styles.rowBorder,
                        ]}
                      >
                        <View
                          style={
                            styles.dateIcon
                          }
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={17}
                            color={
                              colors.navy
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.rowMain
                          }
                        >
                          <Text
                            style={
                              styles.dayDate
                            }
                          >
                            {formatDate(
                              row.date
                            )}
                          </Text>

                          <Text
                            style={
                              styles.rowSubtext
                            }
                          >
                            {items}{" "}
                            {items === 1
                              ? "item"
                              : "items"}{" "}
                            sold
                          </Text>
                        </View>

                        <View
                          style={
                            styles.rowAmounts
                          }
                        >
                          <Text
                            style={
                              styles.salesRowTotal
                            }
                          >
                            {formatCurrency(
                              total
                            )}
                          </Text>

                          <View
                            style={
                              styles.amountLine
                            }
                          >
                            <View
                              style={[
                                styles.amountDot,
                                styles.cashDot,
                              ]}
                            />

                            <Text
                              style={
                                styles.dayCredit
                              }
                            >
                              {formatCurrency(
                                cash
                              )}{" "}
                              cash
                            </Text>
                          </View>

                          <View
                            style={
                              styles.amountLine
                            }
                          >
                            <View
                              style={[
                                styles.amountDot,
                                styles.creditDot,
                              ]}
                            />

                            <Text
                              style={
                                styles.dayPayment
                              }
                            >
                              {formatCurrency(
                                credit
                              )}{" "}
                              utang
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  }
                )}
              </Card>
            )}
          </>
        )}

        {/* ================================================== */}
        {/* UNPAID */}
        {/* ================================================== */}

        {tab === "unpaid" && (
          <>
            <SectionHeader
              icon="wallet-outline"
              title={`Unpaid balances (${unpaid.length})`}
              subtitle="Customers with outstanding balances"
            />

            <View
              style={
                styles.outstandingCard
              }
            >
              <View
                style={
                  styles.outstandingIcon
                }
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color={
                    colors.goldLight
                  }
                />
              </View>

              <View
                style={
                  styles.outstandingInfo
                }
              >
                <Text
                  style={
                    styles.totalLabel
                  }
                >
                  Total outstanding
                </Text>

                <Text
                  style={
                    styles.totalValue
                  }
                >
                  {formatCurrency(
                    totalUnpaid
                  )}
                </Text>

                <Text
                  style={
                    styles.outstandingHint
                  }
                >
                  {unpaid.length === 1
                    ? "1 debtor with balance"
                    : `${unpaid.length} debtors with balances`}
                </Text>
              </View>
            </View>

            {unpaid.length === 0 ? (
              <EmptyState
                icon="checkmark-circle-outline"
                title="Everyone is settled up"
              />
            ) : (
              <Card
                style={styles.listCard}
              >
                {unpaid.map((d, i) => (
                  <Pressable
                    key={d.id}
                    style={({
                      pressed,
                    }) => [
                      styles.dayRow,

                      i !==
                        unpaid.length - 1 &&
                        styles.rowBorder,

                      pressed &&
                        styles.rowPressed,
                    ]}
                    onPress={() =>
                      router.push(
                        `/debtors/${d.id}`
                      )
                    }
                  >
                    <View
                      style={
                        styles.personIcon
                      }
                    >
                      <Ionicons
                        name="person-outline"
                        size={17}
                        color={
                          colors.navy
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.rowMain
                      }
                    >
                      <Text
                        style={
                          styles.dayDate
                        }
                        numberOfLines={1}
                      >
                        {d.full_name}
                      </Text>

                      <Text
                        style={
                          styles.rowSubtext
                        }
                      >
                        Outstanding balance
                      </Text>
                    </View>

                    <View
                      style={
                        styles.balanceRight
                      }
                    >
                      <Text
                        style={
                          styles.balanceAmount
                        }
                      >
                        {formatCurrency(
                          d.balance
                        )}
                      </Text>

                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={
                          colors.textMuted
                        }
                      />
                    </View>
                  </Pressable>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ================================================== */}
        {/* HISTORY */}
        {/* ================================================== */}

        {tab === "history" && (
          [
            <SectionHeader
              key="history-header"
              icon="time-outline"
              title="Recent history"
              subtitle="Filter your latest transactions"
              action={
                <Pressable
                  onPress={handleClearHistory}
                  disabled={!user?.id || historyClearing}
                  style={({ pressed }) => [
                    styles.historyClearButton,
                    (!user?.id || historyClearing) &&
                      styles.historyClearButtonDisabled,
                    pressed &&
                      user?.id &&
                      !historyClearing &&
                      styles.historyClearButtonPressed,
                  ]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color={colors.danger}
                  />
                  <Text style={styles.historyClearText}>
                    {historyClearing ? "Clearing" : "Clear"}
                  </Text>
                </Pressable>
              }
            />,

            <View
              key="history-filters"
              style={styles.historyFiltersSticky}
            >
              <Card style={styles.historyFiltersCard}>
              <Text
                style={styles.filterLabel}
              >
                Transaction type
              </Text>

              <HistoryFilterDropdown
                title="Transaction type"
                value={
                  historyTypeFilter
                }
                options={[
                  {
                    label:
                      "All transactions",
                    value: "all",
                  },

                  {
                    label: "Cash sale",
                    value: "cash",
                  },

                  {
                    label: "Utang",
                    value: "credit",
                  },

                  {
                    label: "Payments",
                    value: "payment",
                  },
                ]}
                onChange={
                  setHistoryTypeFilter
                }
              />

              <Text
                style={styles.filterLabel}
              >
                Date
              </Text>

              <HistoryFilterDropdown
                title="Date"
                value={
                  historyDateFilter
                }
                options={[
                  {
                    label: "All dates",
                    value: "all",
                  },

                  ...historyDates.map(
                    (date) => ({
                      label:
                        formatDate(
                          date
                        ),
                      value: date,
                    })
                  ),
                ]}
                onChange={
                  setHistoryDateFilter
                }
              />
              </Card>
            </View>

            , (history.length === 0 ? (
              <EmptyState
                key="history-empty"
                icon="time-outline"
                title="No activity recorded yet"
              />
            ) : filteredHistory.length ===
              0 ? (
              <EmptyState
                key="history-no-match"
                icon="funnel-outline"
                title="No matching transactions"
                subtitle="Try a different transaction type or date."
              />
            ) : (
              <Card
                key="history-records"
                style={styles.listCard}
              >
                {filteredHistory.map(
                  (entry, i) => (
                    <Pressable
                      key={entry.id}
                      onLongPress={() =>
                        handleDeleteHistoryEntry(entry)
                      }
                      delayLongPress={450}
                      style={[
                        styles.dayRow,

                        i !==
                          filteredHistory.length -
                            1 &&
                          styles.rowBorder,
                      ]}
                    >
                      <View
                        style={[
                          styles.historyIcon,

                          entry.type ===
                            "payment"
                            ? styles.historyPaymentIcon
                            : styles.historySaleIcon,
                        ]}
                      >
                        <Ionicons
                          name={
                            entry.type ===
                            "payment"
                              ? "arrow-down-outline"
                              : "cart-outline"
                          }
                          size={17}
                          color={
                            entry.type ===
                            "payment"
                              ? colors.success
                              : colors.navy
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.rowMain
                        }
                      >
                        <Text
                          style={
                            styles.dayDate
                          }
                          numberOfLines={1}
                        >
                          {entry.label}
                        </Text>

                        <Text
                          style={
                            styles.metaText
                          }
                          numberOfLines={1}
                        >
                          {entry.debtor_name
                            ? `${entry.debtor_name} - `
                            : ""}
                          {formatDate(
                            entry.date
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.historyAmountBox
                        }
                      >
                        <Text
                          style={[
                            styles.historyAmount,

                            entry.type ===
                              "payment" &&
                              styles.paymentAmount,
                          ]}
                        >
                          {entry.type ===
                          "payment"
                            ? "-"
                            : "+"}

                          {formatCurrency(
                            entry.amount
                          )}
                        </Text>

                        <Text
                          style={
                            styles.historyType
                          }
                        >
                          {entry.type ===
                          "payment"
                            ? "Payment"
                            : entry.type ===
                                "credit"
                              ? "Utang"
                              : "Cash sale"}
                        </Text>
                      </View>
                    </Pressable>
                  )
                )}
              </Card>
            ))
          ]
        )}

        {/* ================================================== */}
        {/* BACKUP */}
        {/* ================================================== */}

        {tab === "backup" && (
          <>
            <SectionHeader
              icon="cloud-upload-outline"
              title="Backup data"
              subtitle="Export a copy of your local SQLite records"
            />

            <Card
              style={styles.featureCard}
            >
              <View
                style={styles.featureTop}
              >
                <View
                  style={styles.featureIcon}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={26}
                    color={
                      colors.navy
                    }
                  />
                </View>

                <View
                  style={
                    styles.featureBadge
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={12}
                    color={
                      colors.success
                    }
                  />

                  <Text
                    style={
                      styles.featureBadgeText
                    }
                  >
                    LOCAL DATA
                  </Text>
                </View>
              </View>

              <Text
                style={styles.backupTitle}
              >
                Spreadsheet backup
              </Text>

              <Text
                style={styles.backupText}
              >
                Create a CSV spreadsheet with
                debtors, inventory, sales, and
                payments. You can save it to Google Drive.
              </Text>

              <View style={styles.backupScheduleSection}>
                <Text style={styles.filterLabel}>
                  Automatic spreadsheet backup
                </Text>

                <HistoryFilterDropdown
                  title="Backup frequency"
                  value={backupSchedule}
                  options={[
                    { label: "Every 8 hours", value: "8" },
                    { label: "Every 12 hours", value: "12" },
                    { label: "Custom hours", value: "custom" },
                  ]}
                  onChange={setBackupSchedule}
                />

                {backupSchedule === "custom" && (
                  <TextInput
                    value={customBackupHours}
                    onChangeText={setCustomBackupHours}
                    keyboardType="number-pad"
                    placeholder="Enter hours (minimum 1)"
                    placeholderTextColor={colors.textMuted}
                    style={styles.backupHoursInput}
                  />
                )}

                <Text style={styles.backupScheduleHint}>
                  {backupScheduleLoading
                    ? "Loading backup preference..."
                    : backupIntervalHours
                    ? `Automatic backups are saved locally every ${backupIntervalHours} hour${backupIntervalHours === 1 ? "" : "s"} while the app is active.`
                    : "Enter a custom backup interval of at least 1 hour."}
                </Text>

                {lastAutoBackupAt && (
                  <Text style={styles.backupScheduleHint}>
                    Last automatic backup: {new Date(lastAutoBackupAt).toLocaleString()}
                  </Text>
                )}
              </View>

              <View
                style={styles.infoStrip}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.navy}
                />

                <Text
                  style={
                    styles.infoStripText
                  }
                >
                  Tap Save spreadsheet, then choose
                  Google Drive from the share sheet to
                  upload a copy.
                </Text>
              </View>

              <Button
                title="Save spreadsheet"
                onPress={
                  handleSaveSpreadsheetBackup
                }
                loading={
                  backupLoading
                }
                icon={
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={colors.white}
                  />
                }
              />
            </Card>

            <SectionHeader
              icon="document-text-outline"
              title="Report output"
              subtitle="Print or save a readable report"
            />

            <Card
              style={styles.featureCard}
            >
              <View
                style={
                  styles.reportOutputHeader
                }
              >
                <View
                  style={styles.featureIcon}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={26}
                    color={
                      colors.navy
                    }
                  />
                </View>

                <View
                  style={
                    styles.reportHeaderText
                  }
                >
                  <Text
                    style={
                      styles.backupTitle
                    }
                  >
                    Print or save reports
                  </Text>

                  <Text
                    style={
                      styles.backupText
                    }
                  >
                    Create a printable
                    report with sales,
                    unpaid balances,
                    recent history, and
                    stock watch.
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.reportActions
                }
              >
                <View style={styles.reportDateFilter}>
                  <Text style={styles.filterLabel}>
                    History records to print
                  </Text>

                  <HistoryFilterDropdown
                    title="History date to print"
                    value={printDateFilter}
                    options={[
                      {
                        label: "All dates",
                        value: "all",
                      },
                      ...historyDates.map((date) => ({
                        label: formatDate(date),
                        value: date,
                      })),
                    ]}
                    onChange={setPrintDateFilter}
                  />
                </View>

                <Button
                  title="Print Reports"
                  variant="ghost"
                  onPress={() =>
                    printReports(false)
                  }
                  loading={
                    reportLoading
                  }
                  disabled={
                    reportLoading
                  }
                  icon={
                    <Ionicons
                      name="print-outline"
                      size={18}
                      color={
                        colors.navy
                      }
                    />
                  }
                />
              </View>
            </Card>

            <SectionHeader
              icon="cube-outline"
              title="Inventory watch"
              subtitle="Products that need attention"
            />

            {lowStock.length === 0 ? (
              <View
                style={
                  styles.healthyCard
                }
              >
                <View
                  style={
                    styles.healthyIcon
                  }
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color={
                      colors.success
                    }
                  />
                </View>

                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.healthyTitle
                    }
                  >
                    Stock levels look
                    healthy
                  </Text>

                  <Text
                    style={
                      styles.healthyText
                    }
                  >
                    No low-stock products
                    need attention right
                    now.
                  </Text>
                </View>
              </View>
            ) : (
              <Card
                style={styles.listCard}
              >
                {lowStock.map(
                  (p, i) => (
                    <Pressable
                      key={p.id}
                      style={({
                        pressed,
                      }) => [
                        styles.dayRow,

                        i !==
                          lowStock.length -
                            1 &&
                          styles.rowBorder,

                        pressed &&
                          styles.rowPressed,
                      ]}
                      onPress={() =>
                        router.push(
                          `/inventory/${p.id}`
                        )
                      }
                    >
                      <View
                        style={
                          styles.stockWarningIcon
                        }
                      >
                        <Ionicons
                          name="warning-outline"
                          size={17}
                          color={
                            colors.danger
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.rowMain
                        }
                      >
                        <Text
                          style={
                            styles.dayDate
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {p.name}
                        </Text>

                        <Text
                          style={
                            styles.rowSubtext
                          }
                        >
                          Low stock
                        </Text>
                      </View>

                      <View
                        style={
                          styles.stockRight
                        }
                      >
                        <Text
                          style={
                            styles.stockNumber
                          }
                        >
                          {
                            p.stock_quantity
                          }
                        </Text>

                        <Text
                          style={
                            styles.stockLeft
                          }
                        >
                          left
                        </Text>

                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={
                            colors.textMuted
                          }
                        />
                      </View>
                    </Pressable>
                  )
                )}
              </Card>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ============================================================
 * PDF REPORT
 * ============================================================ */

function buildReportsHtml(
  report
) {
  const generatedAt =
    new Date().toLocaleString(
      "en-PH",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }
    );

  const summaryCards = [
    [
      "Cash sales",
      formatCurrency(
        report.todayCash
      ),
      "cash",
    ],

    [
      "Utang sales",
      formatCurrency(
        report.todayCredit
      ),
      "utang",
    ],

    [
      "Total sales",
      formatCurrency(
        report.todayGrandTotal
      ),
      "total",
    ],

    [
      "Items sold",
      String(
        report.todayItemsSold
      ),
      "items",
    ],
  ]
    .map(
      ([
        label,
        value,
        variant,
      ]) => `
        <div class="metric ${variant}">
          <p>${label}</p>
          <strong>${value}</strong>
        </div>`
    )
    .join("");

  const unpaidRows =
    report.unpaid.length
      ? report.unpaid
          .map(
            (debtor) => `
            <tr>
              <td>${escapeHtml(
                debtor.full_name
              )}</td>
              <td class="amount danger">
                ${formatCurrency(
                  debtor.balance
                )}
              </td>
            </tr>`
          )
          .join("")
      : `
        <tr>
          <td colspan="2" class="empty">
            Everyone is settled up.
          </td>
        </tr>`;

  const stockRows =
    report.lowStock.length
      ? report.lowStock
          .map(
            (product) => `
            <tr>
              <td>${escapeHtml(
                product.name
              )}</td>

              <td class="amount danger">
                ${product.stock_quantity}
                left
              </td>
            </tr>`
          )
          .join("")
      : `
        <tr>
          <td colspan="2" class="empty">
            Stock levels look healthy.
          </td>
        </tr>`;

  const historyRows =
    report.history.length
      ? report.history
          .map((entry) => {
            const type =
              entry.type ===
              "payment"
                ? "Payment"
                : entry.type ===
                    "credit"
                  ? "Utang"
                  : "Cash sale";

            const party =
              entry.debtor_name ||
              "-";

            const amountPrefix =
              entry.type ===
              "payment"
                ? "-"
                : "+";

            return `
            <tr>
              <td>${formatDate(
                entry.date
              )}</td>

              <td>
                ${escapeHtml(type)}
              </td>

              <td>
                ${escapeHtml(party)}
              </td>

              <td class="amount ${
                entry.type ===
                "payment"
                  ? "success"
                  : ""
              }">
                ${amountPrefix}${formatCurrency(
                  entry.amount
                )}
              </td>
            </tr>`;
          })
          .join("")
      : `
        <tr>
          <td colspan="4" class="empty">
            No activity recorded yet.
          </td>
        </tr>`;

  return `
    <html>
      <head>
        <meta charset="utf-8" />

        <title>
          Track and Tally Reports
        </title>

        <style>
          @page {
            margin: 18mm 14mm;
          }

          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .report {
              max-width: none;
            }

            thead {
              display: table-header-group;
            }

            h2,
            tr,
            .metric {
              break-inside: avoid;
              page-break-inside: avoid;
            }

            h2 {
              break-after: avoid;
              page-break-after: avoid;
            }
          }

          * {
            box-sizing: border-box;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #20242c;
            margin: 0;
            font-size: 12px;
          }

          .report {
            max-width: 800px;
            margin: 0 auto;
          }

          header {
            border-bottom:
              3px solid #1E3A5F;

            display: flex;
            justify-content:
              space-between;

            align-items:
              flex-end;

            padding-bottom: 12px;
            margin-bottom: 18px;
          }

          h1 {
            color: #1E3A5F;
            font-size: 25px;
            margin: 0;
          }

          .subtitle {
            color: #6B7280;
            font-size: 12px;
            margin: 5px 0 0;
          }

          .generated {
            color: #6B7280;
            font-size: 10px;
            text-align: right;
          }

          h2 {
            color: #1E3A5F;
            font-size: 14px;
            margin:
              23px 0 9px;
          }

          .metrics {
            display: grid;
            grid-template-columns:
              repeat(4, 1fr);

            gap: 9px;
          }

          .metric {
            background: #F7F4EA;
            border-top:
              3px solid #1E3A5F;

            padding: 10px;
          }

          .metric.utang {
            border-color: #BE4646;
          }

          .metric.total {
            border-color: #378C5A;
          }

          .metric.items {
            border-color: #D9A928;
          }

          .metric p {
            color: #6B7280;
            font-size: 10px;
            margin:
              0 0 5px;
          }

          .metric strong {
            color: #20242C;
            font-size: 15px;
          }

          .section-head {
            display: flex;
            justify-content:
              space-between;

            align-items:
              baseline;
          }

          .total-outstanding {
            color: #BE4646;
            font-weight: bold;
            font-size: 11px;
          }

          table {
            border-collapse:
              collapse;

            width: 100%;
          }

          th {
            background: #1E3A5F;
            color: #fff;
            font-size: 10px;
            letter-spacing: .2px;
            text-align: left;
          }

          th,
          td {
            border-bottom:
              1px solid #E4E0D2;

            padding: 8px;
          }

          tr {
            page-break-inside:
              avoid;
          }

          .amount {
            text-align: right;
            font-weight: bold;
            white-space: nowrap;
          }

          .danger {
            color: #BE4646;
          }

          .success {
            color: #378C5A;
          }

          .empty {
            color: #6B7280;
            font-style: italic;
            text-align: center;
            padding: 13px;
          }

          footer {
            border-top:
              1px solid #E4E0D2;

            color: #6B7280;
            font-size: 10px;
            margin-top: 28px;
            padding-top: 12px;
            text-align: center;
          }
        </style>
      </head>

      <body>
        <main class="report">

          <header>
            <div>
              <h1>
                Track and Tally
              </h1>

              <p class="subtitle">
                Store activity report
              </p>
            </div>

            <p class="generated">
              Generated<br />
              ${generatedAt}
            </p>
          </header>

          <h2>
            Today's sales summary
          </h2>

          <section class="metrics">
            ${summaryCards}
          </section>

          <div class="section-head">
            <h2>
              Unpaid balances
              (${report.unpaid.length})
            </h2>

            <span
              class="total-outstanding"
            >
              Total:
              ${formatCurrency(
                report.totalUnpaid
              )}
            </span>
          </div>

          <table>
            <thead>
              <tr>
                <th>
                  Customer
                </th>

                <th class="amount">
                  Balance
                </th>
              </tr>
            </thead>

            <tbody>
              ${unpaidRows}
            </tbody>
          </table>

          <h2>
            Transaction history
            (${escapeHtml(report.historyDateLabel)})
          </h2>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Customer</th>

                <th class="amount">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              ${historyRows}
            </tbody>
          </table>

          <h2>
            Inventory watch
          </h2>

          <table>
            <thead>
              <tr>
                <th>
                  Product
                </th>

                <th class="amount">
                  Stock
                </th>
              </tr>
            </thead>

            <tbody>
              ${stockRows}
            </tbody>
          </table>

          <footer>
            Generated by Track and Tally
          </footer>

        </main>
      </body>
    </html>
  `;
}

/* ============================================================
 * HELPERS
 * ============================================================ */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#39;"
    );
}

function openWebPrintDialog(
  html
) {
  const printWindow =
    globalThis.window?.open(
      "",
      "_blank"
    );

  if (!printWindow) {
    Alert.alert(
      "Print blocked",
      "Allow pop-ups for this app, then try again."
    );

    return;
  }

  let printed = false;
  const printWhenReady = () => {
    if (printed || printWindow.closed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
  };

  printWindow.addEventListener("load", printWhenReady, { once: true });
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  if (printWindow.document.readyState === "complete") {
    setTimeout(printWhenReady, 0);
  }
}

function getExportErrorMessage(
  error
) {
  const message =
    error instanceof Error
      ? error.message
      : "";

  if (message) {
    return message;
  }

  return "Please restart the app and try again.";
}

function getHistoryDateKey(
  value
) {
  return String(
    value || ""
  ).slice(0, 10);
}

/* ============================================================
 * HISTORY FILTER DROPDOWN
 * ============================================================ */

function HistoryFilterDropdown({
  title,
  value,
  options,
  onChange,
}) {
  const [visible, setVisible] =
    useState(false);

  const selectedOption =
    options.find(
      (option) =>
        option.value === value
    );

  function selectOption(
    nextValue
  ) {
    onChange(nextValue);
    setVisible(false);
  }

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.filterDropdown,

          pressed &&
            styles.filterDropdownPressed,
        ]}
        onPress={() =>
          setVisible(true)
        }
      >
        <Text
          style={
            styles.filterDropdownText
          }
        >
          {selectedOption?.label ||
            "Select an option"}
        </Text>

        <Ionicons
          name="chevron-down"
          size={18}
          color={
            colors.textMuted
          }
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setVisible(false)
        }
      >
        <Pressable
          style={
            styles.filterModalOverlay
          }
          onPress={() =>
            setVisible(false)
          }
        >
          <Pressable
            style={
              styles.filterModal
            }
          >
            <Text
              style={
                styles.filterModalTitle
              }
            >
              {title}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterOptions
              }
            >
              {options.map(
                (option) => (
                  <Pressable
                    key={
                      option.value
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.filterOption,

                      option.value ===
                        value &&
                        styles.filterOptionSelected,

                      pressed &&
                        styles.filterDropdownPressed,
                    ]}
                    onPress={() =>
                      selectOption(
                        option.value
                      )
                    }
                  >
                    <Text
                      style={
                        styles.filterOptionText
                      }
                    >
                      {option.label}
                    </Text>

                    {option.value ===
                      value && (
                      <Ionicons
                        name="checkmark"
                        size={19}
                        color={
                          colors.success
                        }
                      />
                    )}
                  </Pressable>
                )
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ============================================================
 * SECTION HEADER
 * ============================================================ */

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
}) {
  return (
    <View
      style={styles.sectionHeader}
    >
      <View
        style={styles.sectionIcon}
      >
        <Ionicons
          name={icon}
          size={18}
          color={colors.navy}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={styles.sectionTitle}
        >
          {title}
        </Text>

        <Text
          style={
            styles.sectionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      {action}
    </View>
  );
}

/* ============================================================
 * TAB BUTTON
 * ============================================================ */

function TabButton({
  label,
  icon,
  active,
  onPress,
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.tabBtn,

        active &&
          styles.tabBtnActive,

        pressed &&
          styles.tabPressed,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.tabIcon,

          active &&
            styles.tabIconActive,
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={
            active
              ? colors.white
              : colors.textMuted
          }
        />
      </View>

      <Text
        style={[
          styles.tabText,

          active &&
            styles.tabTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ============================================================
 * METRIC CARD
 * ============================================================ */

function MetricCard({
  label,
  value,
  icon,
  danger = false,
  success = false,
  iconBackground = "cream",
}) {
  return (
    <Card
      style={styles.metricCard}
    >
      <View
        style={[
          styles.metricIcon,

          iconBackground ===
            "danger" &&
            styles.metricIconDanger,

          iconBackground ===
            "success" &&
            styles.metricIconSuccess,
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={
            danger
              ? colors.danger
              : success
              ? colors.success
              : colors.navy
          }
        />
      </View>

      <Text
        style={styles.metricLabel}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.metricValue,

          danger && {
            color: colors.danger,
          },

          success && {
            color: colors.success,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </Card>
  );
}

/* ============================================================
 * STYLES
 * ============================================================ */

const styles =
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor:
        colors.cream,
    },

    /* ---------------- HEADER TABS ---------------- */

    tabsOuter: {
      paddingHorizontal:
        spacing.md,
      paddingTop: 4,
      paddingBottom:
        spacing.sm,
    },

    tabs: {
      flexDirection:
        "row",

      backgroundColor:
        colors.white,

      borderRadius: 16,

      padding: 4,

      borderWidth: 1,

      borderColor:
        colors.border,

      shadowColor:
        colors.navy,

      shadowOpacity:
        0.05,

      shadowRadius: 8,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 2,
    },

    tabBtn: {
      flex: 1,
      minWidth: 0,
      minHeight: 52,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 3,
    },

    tabBtnActive: {
      backgroundColor:
        colors.navy,
    },

    tabPressed: {
      opacity: 0.78,

      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    tabIcon: {
      width: 26,
      height: 26,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },

    tabIconActive: {
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    tabText: {
      fontSize: 10,
      fontWeight: "800",
      color:
        colors.textMuted,
    },

    tabTextActive: {
      color:
        colors.white,
    },

    /* ---------------- SCROLL CONTENT ---------------- */

    container: {
      paddingHorizontal:spacing.md,
      paddingTop:spacing.sm,
      paddingBottom:spacing.lg,
      gap:spacing.md,
    },

    /* ---------------- SECTION HEADER ---------------- */

    sectionHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        spacing.sm,

      marginTop: 4,
    },

    sectionIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        colors.white,

      borderWidth: 1,

      borderColor:
        colors.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      shadowColor:
        colors.navy,

      shadowOpacity:
        0.035,

      shadowRadius: 5,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      elevation: 1,
    },

    sectionTitle: {
      ...typography.heading,
      fontSize: 15,
      color:
        colors.navy,
    },

    sectionSubtitle: {
      fontSize: 10,
      color:
        colors.textMuted,
      marginTop: 2,
    },

    /* ---------------- SALES PERIOD FILTER ---------------- */

    salesPeriodCard: {
      borderRadius: 18,
      padding: 14,
      gap: 12,
    },

    salesPeriodHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    salesPeriodTitle: {
      fontSize: 14,
      fontWeight: "900",
      color:
        colors.navy,
    },

    salesPeriodSubtitle: {
      fontSize: 10,
      color:
        colors.textMuted,
      marginTop: 3,
    },

    salesPeriodButtons: {
      flexDirection:
        "row",
      gap: 7,
    },

    salesPeriodButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: 12,

      backgroundColor:
        colors.cream,

      borderWidth: 1,

      borderColor:
        colors.border,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexDirection:
        "row",

      gap: 5,
    },

    salesPeriodButtonActive: {
      backgroundColor:
        colors.navy,

      borderColor:
        colors.navy,
    },

    salesPeriodButtonPressed: {
      opacity: 0.78,

      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    salesPeriodButtonText: {
      fontSize: 11,
      fontWeight: "900",
      color:
        colors.navy,
    },

    salesPeriodButtonTextActive: {
      color:
        colors.white,
    },

    /* ---------------- SUMMARY ---------------- */

    summaryGrid: {
      flexDirection:
        "row",

      flexWrap:
        "wrap",

      gap:
        spacing.sm,
    },

    metricCard: {
      width: "48%",

      flexGrow: 1,

      minHeight: 124,

      borderRadius: 18,

      alignItems:
        "flex-start",

      justifyContent:
        "center",

      padding: 15,

      gap: 6,
    },

    metricIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,

      backgroundColor:
        colors.cream,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 2,
    },

    metricIconDanger: {
      backgroundColor:
        "rgba(190,70,70,0.10)",
    },

    metricIconSuccess: {
      backgroundColor:
        "rgba(55,140,90,0.10)",
    },

    metricLabel: {
      fontSize: 10,

      color:
        colors.textMuted,

      fontWeight: "700",
    },

    metricValue: {
      fontSize: 19,

      fontWeight: "900",

      color:
        colors.text,

      maxWidth: "100%",
    },

    /* ---------------- LIST CARDS ---------------- */

    listCard: {
      padding: 0,

      overflow:
        "hidden",

      borderRadius: 18,
    },

    dayRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,

      paddingHorizontal: 13,

      paddingVertical: 13,

      minHeight: 70,
    },

    rowBorder: {
      borderBottomWidth: 1,

      borderBottomColor:
        colors.border,
    },

    rowPressed: {
      backgroundColor:
        colors.cream,
    },

    dateIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,

      backgroundColor:
        colors.cream,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },

    personIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,

      backgroundColor:
        colors.cream,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },

    rowMain: {
      flex: 1,
      minWidth: 0,
    },

    dayDate: {
      fontSize: 13,

      fontWeight: "900",

      color:
        colors.text,
    },

    rowSubtext: {
      fontSize: 10,

      color:
        colors.textMuted,

      marginTop: 3,
    },

    metaText: {
      fontSize: 10,

      color:
        colors.textMuted,

      marginTop: 4,
    },

    rowAmounts: {
      alignItems:
        "flex-end",

      gap: 5,
    },

    salesRowTotal: {
      fontSize: 13,

      fontWeight: "900",

      color:
        colors.navy,

      marginBottom: 2,
    },

    amountLine: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    amountDot: {
      width: 6,
      height: 6,

      borderRadius:
        radius.full,
    },

    cashDot: {
      backgroundColor:
        colors.navy,
    },

    creditDot: {
      backgroundColor:
        colors.success,
    },

    dayCredit: {
      fontSize: 10,

      fontWeight: "800",

      color:
        colors.navy,
    },

    dayPayment: {
      fontSize: 10,

      fontWeight: "800",

      color:
        colors.success,
    },

    /* ---------------- UNPAID ---------------- */

    outstandingCard: {
      backgroundColor:
        colors.navy,

      borderRadius: 20,

      padding: 18,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 13,

      shadowColor:
        colors.navy,

      shadowOpacity:
        0.18,

      shadowRadius: 12,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      elevation: 5,
    },

    outstandingIcon: {
      width: 48,
      height: 48,

      borderRadius: 15,

      backgroundColor:
        "rgba(255,255,255,0.10)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    outstandingInfo: {
      flex: 1,
    },

    totalLabel: {
      color:
        colors.goldLight,

      fontSize: 10,

      fontWeight: "800",

      letterSpacing: 0.3,
    },

    totalValue: {
      color:
        colors.white,

      fontSize: 27,

      fontWeight: "900",

      marginTop: 2,
    },

    outstandingHint: {
      color:
        "rgba(255,255,255,0.65)",

      fontSize: 10,

      marginTop: 2,
    },

    balanceRight: {
      alignItems:
        "flex-end",

      flexDirection:
        "row",

      gap: 6,
    },

    balanceAmount: {
      color:
        colors.danger,

      fontSize: 13,

      fontWeight: "900",
    },

    /* ---------------- HISTORY ---------------- */

    historyClearButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "rgba(179,65,59,0.35)",
      backgroundColor: "rgba(179,65,59,0.06)",
    },

    historyClearButtonDisabled: {
      opacity: 0.5,
    },

    historyClearButtonPressed: {
      opacity: 0.72,
    },

    historyClearText: {
      color: colors.danger,
      fontSize: 11,
      fontWeight: "800",
    },

    historyFiltersSticky: {
      backgroundColor: colors.cream,
      zIndex: 1,
    },

    historyFiltersCard: {
      borderRadius: 18,

      gap: 9,

      padding: 14,
    },

    filterLabel: {
      color:
        colors.textMuted,

      fontSize: 10,

      fontWeight: "800",

      marginTop: 2,
    },

    filterDropdown: {
      backgroundColor:
        colors.cream,

      borderColor:
        colors.border,

      borderRadius:
        radius.md,

      borderWidth: 1,

      paddingHorizontal: 12,

      minHeight: 46,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    filterDropdownPressed: {
      opacity: 0.8,
    },

    filterDropdownText: {
      color:
        colors.text,

      fontSize: 13,

      fontWeight: "800",
    },

    filterModalOverlay: {
      flex: 1,

      justifyContent:
        "center",

      padding:
        spacing.lg,

      backgroundColor:
        "rgba(0,0,0,0.35)",
    },

    filterModal: {
      maxHeight: "75%",

      borderRadius: 18,

      padding:
        spacing.md,

      backgroundColor:
        colors.white,
    },

    filterModalTitle: {
      color:
        colors.navy,

      fontSize: 16,

      fontWeight: "900",

      marginBottom:
        spacing.sm,
    },

    filterOptions: {
      gap: 4,
    },

    filterOption: {
      minHeight: 48,

      borderRadius:
        radius.sm,

      paddingHorizontal:
        spacing.sm,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    filterOptionSelected: {
      backgroundColor:
        "rgba(217,169,40,0.12)",
    },

    filterOptionText: {
      color:
        colors.text,

      fontSize: 14,

      fontWeight: "700",
    },

    historyIcon: {
      width: 38,
      height: 38,

      borderRadius: 12,

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },

    historySaleIcon: {
      backgroundColor:
        colors.cream,
    },

    historyPaymentIcon: {
      backgroundColor:
        "rgba(55,140,90,0.10)",
    },

    historyAmountBox: {
      alignItems:
        "flex-end",

      minWidth: 72,
    },

    historyAmount: {
      fontSize: 12,

      fontWeight: "900",

      color:
        colors.navy,
    },

    paymentAmount: {
      color:
        colors.success,
    },

    historyType: {
      fontSize: 9,

      color:
        colors.textMuted,

      marginTop: 3,

      fontWeight: "700",
    },

    /* ---------------- BACKUP ---------------- */

    featureCard: {
      borderRadius: 20,

      gap:
        spacing.sm,

      padding: 17,
    },

    featureTop: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 2,
    },

    featureIcon: {
      width: 54,
      height: 54,

      borderRadius: 17,

      backgroundColor:
        colors.cream,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    featureBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,

      paddingHorizontal: 8,

      paddingVertical: 5,

      borderRadius:
        radius.full,

      backgroundColor:
        "rgba(55,140,90,0.10)",
    },

    featureBadgeText: {
      fontSize: 8,

      fontWeight: "900",

      color:
        colors.success,

      letterSpacing: 0.4,
    },

    backupTitle: {
      fontSize: 16,

      fontWeight: "900",

      color:
        colors.text,

      marginTop: 3,
    },

    backupText: {
      fontSize: 12,

      color:
        colors.textMuted,

      marginTop: 3,

      lineHeight: 18,
    },

    backupScheduleSection: {
      gap: spacing.xs,
      marginTop: spacing.sm,
    },

    backupHoursInput: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.cream,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 13,
    },

    backupScheduleHint: {
      color: colors.textMuted,
      fontSize: 10,
      lineHeight: 15,
    },

    infoStrip: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,

      backgroundColor:
        colors.cream,

      borderRadius: 12,

      paddingHorizontal: 11,

      paddingVertical: 9,

      marginTop: 4,

      marginBottom: 3,
    },

    infoStripText: {
      flex: 1,

      fontSize: 10,

      color:
        colors.textMuted,

      lineHeight: 15,
    },

    reportOutputHeader: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap:
        spacing.md,
    },

    reportHeaderText: {
      flex: 1,
    },

    reportActions: {
      gap:
        spacing.sm,

      marginTop: 5,
    },

    reportDateFilter: {
      gap: spacing.xs,
    },

    /* ---------------- INVENTORY WATCH ---------------- */

    stockWarningIcon: {
      width: 38,
      height: 38,

      borderRadius: 12,

      backgroundColor:
        "rgba(190,70,70,0.10)",

      alignItems:
        "center",

      justifyContent:
        "center",

      flexShrink: 0,
    },

    stockRight: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    stockNumber: {
      fontSize: 14,

      fontWeight: "900",

      color:
        colors.danger,
    },

    stockLeft: {
      fontSize: 10,

      color:
        colors.textMuted,

      fontWeight: "700",

      marginRight: 2,
    },

    healthyCard: {
      backgroundColor:
        colors.white,

      borderWidth: 1,

      borderColor:
        "rgba(55,140,90,0.18)",

      borderRadius: 18,

      padding: 15,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 12,

      shadowColor:
        colors.navy,

      shadowOpacity:
        0.035,

      shadowRadius: 7,

      shadowOffset: {
        width: 0,
        height: 3,
      },

      elevation: 1,
    },

    healthyIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      backgroundColor:
        "rgba(55,140,90,0.10)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    healthyTitle: {
      fontSize: 13,

      fontWeight: "900",

      color:
        colors.text,
    },

    healthyText: {
      fontSize: 10,

      color:
        colors.textMuted,

      marginTop: 3,

      lineHeight: 15,
    },
  });
