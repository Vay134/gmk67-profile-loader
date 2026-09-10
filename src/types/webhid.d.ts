interface HIDDevice {
    readonly vendorId: number;
    readonly productId: number;
    readonly productName?: string;
    readonly opened: boolean;
    readonly collections: HIDCollectionInfo[];
    open(): Promise<void>;
    close(): Promise<void>;
    sendReport(reportId: number, data: BufferSource): Promise<void>;
    addEventListener(type: "inputreport", listener: (event: HIDInputReportEvent) => void): void;
    removeEventListener(type: "inputreport", listener: (event: HIDInputReportEvent) => void): void;
}

interface HIDCollectionInfo {
    readonly usagePage?: number;
    readonly usage?: number;
    readonly children?: HIDCollectionInfo[];
    readonly inputReports?: HIDReportInfo[];
    readonly outputReports?: HIDReportInfo[];
}

interface HIDReportInfo {
    readonly reportId: number;
    readonly items?: Array<{ readonly reportSize?: number; readonly reportCount?: number }>;
}

interface HIDInputReportEvent extends Event {
    readonly device: HIDDevice;
    readonly reportId: number;
    readonly data: DataView;
}

interface HID {
    requestDevice(options: { filters: Array<{ vendorId?: number; productId?: number; usagePage?: number; usage?: number }> }): Promise<HIDDevice[]>;
    getDevices(): Promise<HIDDevice[]>;
    addEventListener(type: "connect" | "disconnect", listener: (event: Event & { device: HIDDevice }) => void): void;
    removeEventListener(type: "connect" | "disconnect", listener: (event: Event & { device: HIDDevice }) => void): void;
}

interface Navigator {
    readonly hid?: HID;
}
