import React from "react";

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    itemName: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
                                                                             isOpen,
                                                                             itemName,
                                                                             onConfirm,
                                                                             onCancel,
                                                                             isDeleting = false,
                                                                         }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={onCancel} // Close on clicking the backdrop
        >
            <div
                className=" rounded-lg shadow-xl p-6 w-full max-w-md m-4"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <h2 className="text-xl font-semibold mb-2">Confirm Deletion</h2>
                <p className=" mb-6">
                    Are you sure you want to delete the file: <br />
                    <strong className="font-medium">{itemName}</strong>?
                </p>
                <p className="text-sm text-red-600 mb-6">
                    This action cannot be undone.
                </p>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                Deleting...
                            </>
                        ) : (
                            "Delete"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;