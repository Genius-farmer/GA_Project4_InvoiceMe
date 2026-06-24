import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  Spinner,
  Alert,
  Button,
  Badge,
  Form,
  Row,
  Col,
  Modal,
} from "react-bootstrap";
import { apiFetch } from "../api";
import styles from "./Invoices.module.css";

const STATUS_VARIANTS = {
  draft: "secondary",
  issued: "primary",
  paid: "success",
  cancelled: "dark",
};

const STATUSES = ["draft", "issued", "paid", "cancelled"];

// date-only fields are stored at UTC midnight - render in UTC so the day doesn't shift.
function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: "UTC" });
}

// amount the client owes = subtotal + tax (Number() the Decimal strings first!)
function invoiceTotal(inv) {
  return Number(inv.subtotal) * (1 + Number(inv.taxRate) / 100);
}
function formatTotal(inv) {
  return `$${invoiceTotal(inv).toFixed(2)}`;
}

// the value a column sorts on
function sortValue(inv, key) {
  switch (key) {
    case "invoiceName":
      return (inv.invoiceName || "").toLowerCase();
    case "client":
      return (inv.client?.companyName || "").toLowerCase();
    case "issueDate":
      return new Date(inv.issueDate).getTime();
    case "total":
      return invoiceTotal(inv);
    case "status":
      return inv.status;
    case "seq":
      return inv.invoiceSeq ?? -1;
    default: // createdAt
      return new Date(inv.createdAt).getTime();
  }
}

// one searchable string per row
function searchableText(inv) {
  return [
    inv.invoiceName,
    inv.client?.companyName,
    inv.invoiceNumber,
    inv.status,
    formatDate(inv.issueDate),
    formatTotal(inv),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);

  const [payTarget, setPayTarget] = useState(null); // the invoice being marked paid
  const [payDate, setPayDate] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    apiFetch("/invoices")
      .then((data) => setInvoices(data.invoices))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices
      .filter((inv) => statusFilter === "all" || inv.status === statusFilter)
      .filter((inv) => q === "" || searchableText(inv).includes(q))
      .sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [invoices, search, statusFilter, sortKey, sortDir]);

  const visibleDraftIds = visible
    .filter((inv) => inv.status === "draft")
    .map((inv) => inv.id);
  const allDraftsSelected =
    visibleDraftIds.length > 0 &&
    visibleDraftIds.every((id) => selected.has(id));

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  function arrow(key) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAllDrafts() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allDraftsSelected) visibleDraftIds.forEach((id) => next.delete(id));
      else visibleDraftIds.forEach((id) => next.add(id));
      return next;
    });
  }
  async function deleteSelected() {
    if (selected.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selected.size} draft invoice(s)? This cannot be undone.`,
      )
    )
      return;
    setDeleting(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          apiFetch(`/invoices/${id}`, { method: "DELETE" }),
        ),
      );
      setInvoices((prev) => prev.filter((inv) => !selected.has(inv.id)));
      setSelected(new Set());
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function openPay(inv) {
    setPayTarget(inv);
    setPayDate(new Date().toISOString().slice(0, 10)); // default today
  }
  async function confirmPay() {
    if (!payTarget) return;
    setPaying(true);
    try {
      const data = await apiFetch(`/invoices/${payTarget.id}/pay`, {
        method: "PATCH",
        body: JSON.stringify({ paidAt: payDate }),
      });
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === data.invoice.id ? data.invoice : inv)),
      );
      setPayTarget(null);
    } catch (err) {
      window.alert(err.message);
    } finally {
      setPaying(false);
    }
  }

  if (loading) return <Spinner animation="border" />;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">Invoices</h1>
        <Button as={Link} to="/invoices/new">
          New Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <p className="text-muted">
          No invoices yet - Create your first invoice!
        </p>
      ) : (
        <>
          <Row className="g-2 mb-3">
            <Col xs={12} md={8}>
              <Form.Control
                type="search"
                placeholder="Search name, client, number, total, date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={12} md={4}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>

          {selected.size > 0 && (
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="text-muted">{selected.size} selected</span>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={deleteSelected}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete selected"}
              </Button>
            </div>
          )}

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>
                  <Form.Check
                    type="checkbox"
                    checked={allDraftsSelected}
                    onChange={toggleAllDrafts}
                    disabled={visibleDraftIds.length === 0}
                    aria-label="Select all draft invoices"
                  />
                </th>

                <th
                  className={styles.sortable}
                  onClick={() => toggleSort("seq")}
                >
                  #{arrow("seq")}
                </th>
                <th
                  className={styles.sortable}
                  onClick={() => toggleSort("invoiceName")}
                >
                  Name{arrow("invoiceName")}
                </th>
                <th>Number</th>
                <th
                  className={styles.sortable}
                  onClick={() => toggleSort("client")}
                >
                  Client{arrow("client")}
                </th>
                <th
                  className={styles.sortable}
                  onClick={() => toggleSort("issueDate")}
                >
                  Issue date{arrow("issueDate")}
                </th>
                <th
                  className={styles.sortable}
                  onClick={() => toggleSort("total")}
                >
                  Total{arrow("total")}
                </th>
                <th
                  className={styles.sortable}
                  onClick={() => toggleSort("status")}
                >
                  Status{arrow("status")}
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    {inv.status === "draft" && (
                      <Form.Check
                        type="checkbox"
                        checked={selected.has(inv.id)}
                        onChange={() => toggleOne(inv.id)}
                        aria-label="Select invoice"
                      />
                    )}
                  </td>

                  <td>{inv.invoiceSeq ?? "-"}</td>
                  <td>
                    {inv.invoiceName || <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {inv.invoiceNumber ?? (
                      <span className="text-muted">Draft</span>
                    )}
                  </td>
                  <td>{inv.client?.companyName}</td>
                  <td>{formatDate(inv.issueDate)}</td>
                  <td>{formatTotal(inv)}</td>
                  <td>
                    <Badge bg={STATUS_VARIANTS[inv.status]}>{inv.status}</Badge>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button
                        as={Link}
                        to={`/invoices/${inv.id}`}
                        size="sm"
                        variant="outline-primary"
                      >
                        View
                      </Button>
                      {inv.status === "issued" && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => openPay(inv)}
                        >
                          Mark paid
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted">
                    No invoices match your search/filter.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </>
      )}

      <Modal show={payTarget !== null} onHide={() => setPayTarget(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Mark as paid</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {payTarget && (
            <p className="text-muted mb-3">{payTarget.invoiceName}</p>
          )}
          <Form.Group controlId="listPayDate">
            <Form.Label>Payment date</Form.Label>
            <Form.Control
              type="date"
              value={payDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setPayDate(e.target.value)}
            />
            <Form.Text className="text-muted">
              When did the money actually arrive? Defaults to today.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPayTarget(null)}>
            Cancel
          </Button>
          <Button variant="success" onClick={confirmPay} disabled={paying}>
            {paying ? "Saving…" : "Mark paid"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
