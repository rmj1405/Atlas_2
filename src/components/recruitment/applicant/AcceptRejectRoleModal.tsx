import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { signOut } from 'next-auth/react'
import type { QueryObserverResult } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import { ApplicationStatus } from '~/server/db/models/AppliedRole'
import type { AppliedRole } from '~/server/db/models/AppliedRole'
import { trpc } from '~/utils/trpc'

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const AcceptRejectRoleModal = ({
  applicantId,
  appliedRole,
  decision,
  buttonColor,
  refetch,
}: {
  applicantId: string
  appliedRole: AppliedRole
  decision: string
  buttonColor: string
  refetch: () => Promise<QueryObserverResult>
}) => {
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const { mutateAsync: mutateAppliedRoleAsync } =
    trpc.recruitment.updateAppliedRoleStatus.useMutation()
  const { mutateAsync: mutateApplicantToMemberAsync } =
    trpc.recruitment.updateApplicantToMember.useMutation()

  const toast = useToast()
  const updateStatus = async () => {
    try {
      const status =
        decision === 'accept'
          ? ApplicationStatus.ACCEPTED
          : ApplicationStatus.REJECTED
      const firstToast = toast({
        duration: null,
        status: 'loading',
        title: 'Updating',
        description: 'Waiting to update...',
      })
      // Update the appliedRole
      await mutateAppliedRoleAsync({
        status: status,
        appliedRoleId: appliedRole.id,
      })
      await refetch()
      toast.close(firstToast)
      toast({
        duration: 2000,
        status: 'success',
        title: 'Success',
        description: 'Application status updated successfully!',
      })
      await delay(1000)
      // Applicant -> Member with accepted role + dept if applicant accepts
      if (status === ApplicationStatus.ACCEPTED) {
        await mutateApplicantToMemberAsync({
          applicantId: applicantId,
          role: appliedRole.role,
          department: appliedRole.department,
        })
        toast({
          duration: 2000,
          status: 'success',
          title: 'Re-login',
          description: `You are now a member. We will require a re-login so you'll be logged out shortly`,
        })
        await delay(3000)
        // need to force him to re-login in order for nextauth to update him from applicant to member
        await signOut()
      }
    } catch (e) {
      toast({
        description: (e as Error).message,
        duration: 2000,
        status: 'error',
        title: 'Oops, an error occurred!',
      })
    }
  }
  return (
    <>
      <button
        onClick={onOpen}
        className={`rounded bg-${buttonColor}-500 px-4 font-bold text-white hover:bg-${buttonColor}-600`}
      >
        {decision === 'accept' ? 'Accept' : 'Reject'}
      </button>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xs"
        isCentered
        lockFocusAcrossFrames
      >
        <ModalOverlay backdropFilter="auto" backdropBlur="1.5px" />
        <ModalContent>
          <ModalHeader fontSize="xl" className="font-[Inter]">
            <Text textAlign="center">
              Confirm {decision === 'accept' ? 'Acceptance' : 'Rejection'}?
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody className="mx-8 flex justify-between font-[Inter]">
            <button
              onClick={() => {
                updateStatus()
                onClose()
              }}
              className="text-l w-sm mt-5 rounded bg-green-500 py-2 px-4 font-bold text-white hover:bg-green-600"
            >
              Confirm
            </button>
            <button
              onClick={onClose}
              className="text-l w-sm ml-10 mt-5 rounded bg-red-500 py-2 px-4 font-bold text-white hover:bg-red-600"
            >
              Cancel
            </button>
          </ModalBody>
          <ModalFooter></ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}

export default AcceptRejectRoleModal
